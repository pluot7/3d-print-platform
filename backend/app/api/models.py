"""
3D 模型 API
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import os
from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_user
from app.api.notifications import create_activity_and_commit
from app.models.notification import ActivityType
from app.models.user import User, UserRole
from app.models.model import Model3D, ModelStatus
from app.models.material import Material
from app.schemas.model import ModelResponse, ModelListResponse, ModelUpdate
from app.utils import model_utils
from app.utils import bambu_slicer

router = APIRouter(prefix="/api/models", tags=["3D模型"])


@router.get("", response_model=ModelListResponse)
def list_models(
    category: Optional[str] = None,
    official_only: bool = False,
    community_only: bool = False,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取公开模型列表（已审核通过的）"""
    try:
        query = db.query(Model3D).filter(
            Model3D.is_published == True,
            Model3D.status == ModelStatus.APPROVED,
        )

        if category:
            query = query.filter(Model3D.category == category)
        if official_only:
            query = query.filter(Model3D.is_official == True)
        if community_only:
            query = query.filter(Model3D.is_official == False)
        if search:
            query = query.filter(
                or_(
                    Model3D.name.ilike(f"%{search}%"),
                    Model3D.description.ilike(f"%{search}%"),
                )
            )

        # 排序逻辑
        if sort == "view_count":
            query = query.order_by(Model3D.view_count.desc(), Model3D.created_at.desc())
        elif sort == "favorite_count":
            from app.models.favorite import Favorite
            fav_subq = (
                db.query(Favorite.model_id, db.func.count(Favorite.id).label("cnt"))
                .group_by(Favorite.model_id)
                .subquery()
            )
            query = (
                query.outerjoin(fav_subq, Model3D.id == fav_subq.c.model_id)
                .order_by(db.func.coalesce(fav_subq.c.cnt, 0).desc(), Model3D.created_at.desc())
            )
        else:
            query = query.order_by(Model3D.created_at.desc())

        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return ModelListResponse(total=total, items=[ModelResponse.model_validate(m) for m in items])
    except Exception as e:
        print(f"[API] list_models error: {type(e).__name__}: {str(e)}")
        raise


@router.get("/my", response_model=ModelListResponse)
def list_my_models(
    user: User = Depends(get_current_user),
    sort: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取用户自己上传的模型"""
    query = db.query(Model3D).filter(Model3D.uploader_id == user.id)
    
    if sort == "oldest":
        query = query.order_by(Model3D.created_at.asc())
    else:
        query = query.order_by(Model3D.created_at.desc())
    
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return ModelListResponse(total=total, items=[ModelResponse.model_validate(m) for m in items])


@router.get("/all", response_model=ModelListResponse)
def list_all_models(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取所有模型列表（管理员用）"""
    if user.role.value not in ('admin'):
        raise HTTPException(status_code=403, detail="仅管理员可查看所有模型")
    
    query = db.query(Model3D)
    
    if status:
        query = query.filter(Model3D.status == status)
    if search:
        query = query.filter(Model3D.name.ilike(f"%{search}%"))
    
    try:
        total = query.count()
        items = query.order_by(Model3D.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        
        result = ModelListResponse(total=total, items=[ModelResponse.model_validate(m) for m in items])
        return result
    except Exception as e:
        print(f"[ERROR] list_all_models failed: {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_id}", response_model=ModelResponse)
def get_model(model_id: int, db: Session = Depends(get_db)):
    """获取模型详情"""
    try:
        model = db.query(Model3D).filter(Model3D.id == model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="模型不存在")
        model.view_count += 1
        db.commit()
        return ModelResponse.model_validate(model)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] get_model error: {type(e).__name__}: {str(e)}")
        raise


@router.post("", response_model=ModelResponse)
def create_model(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form("other"),
    material: str = Form("pla"),
    layer_height: Optional[float] = Form(None),
    infill: Optional[int] = Form(None),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """上传新模型（自动计算体积/重量/尺寸 + 转换为glb）"""
    user_id = user.id
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件格式，支持: {settings.ALLOWED_EXTENSIONS}")
    
    # MIME 类型检测（同步方式：用 python-magic 读取文件头部）
    try:
        import magic
        head = file.file.read(8192)
        file.file.seek(0)
        
        mime_map = {
            '.3mf': 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
            '.stl': ['application/vnd.ms-package.stl', 'model/stl', 'application/sla', 'application/octet-stream'],
        }
        allowed = mime_map.get(file_ext, ['application/octet-stream'])
        if not isinstance(allowed, list):
            allowed = [allowed]
        detected = magic.from_buffer(head, mime=True)
        if detected not in allowed and detected not in ('text/plain', 'application/octet-stream'):
            raise HTTPException(status_code=400, detail=f"文件类型不匹配 (检测到 {detected}，期望 {allowed[0]})")
    except ImportError:
        pass  # python-magic 未安装，跳过
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.warning(f"MIME检测失败（跳过）: {e}")
    
    import uuid
    upload_dir = os.path.join(settings.UPLOAD_DIR, "models")
    glb_dir = os.path.join(settings.UPLOAD_DIR, "glb")
    os.makedirs(upload_dir, exist_ok=True)
    os.makedirs(glb_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex[:8]}_{name}{file_ext}"
    file_path = os.path.join(upload_dir, unique_name)

    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    glb_path = None
    model_info = {
        'volume': None,
        'weight': None,
        'dimensions_x': None,
        'dimensions_y': None,
        'dimensions_z': None,
    }
    
    try:
        # === BambuStudio 精确切片（3MF 唯一格式）===
        slicer_result = bambu_slicer.slice_model(
            file_path,
            material=material,
            infill=infill or 15,
            layer_height=layer_height or 0.20,
        )
        if slicer_result:
            model_info['weight'] = slicer_result['weight_g']
            raw_vol = slicer_result['original_volume_mm3']
            if raw_vol and raw_vol > 0:
                model_info['volume'] = round(raw_vol / 1000, 2)
            # 尺寸从切片结果中的包围盒取
            objects = slicer_result.get('objects', [])
            if objects:
                bbox = objects[0].get('bbox', {})
                model_info['dimensions_x'] = round(bbox.get('width', 0), 1)
                model_info['dimensions_y'] = round(bbox.get('depth', 0), 1)
                model_info['dimensions_z'] = round(bbox.get('height', 0), 1)
            print(f"[BambuSlicer] 精确重量: {slicer_result['weight_g']}g 体积: {model_info['volume']}cm3")
        else:
            print(f"[BambuSlicer] 切片失败，模型无重量数据")
        
        success, msg, glb_path = model_utils.convert_to_glb(file_path, glb_dir)
        if success:
            try:
                thumb_dir = os.path.join(settings.UPLOAD_DIR, "thumbs")
                os.makedirs(thumb_dir, exist_ok=True)
                base_name = os.path.splitext(os.path.basename(glb_path))[0]
                thumb_path = os.path.join(thumb_dir, f"{base_name}.png")
                if model_utils.generate_thumbnail(file_path, thumb_path):
                    print(f"[缩略图] 生成成功: {thumb_path}")
            except Exception as thumb_err:
                print(f"[缩略图] 生成跳过: {thumb_err}")
        else:
            print(f"[模型转换] 失败: {msg}")
            
    except Exception as e:
        print(f"[模型处理] 错误: {str(e)}")

    material_row = db.query(Material).filter(Material.name_en == material).first()
    price_per_gram = material_row.price_per_gram if material_row else 0.08
    weight_val = model_info['weight'] or 0
    base_price = round(weight_val * price_per_gram, 2)

    model = Model3D(
        name=name,
        description=description,
        category=category,
        material=material,
        layer_height=layer_height,
        infill=infill,
        base_price=base_price,
        is_official=(user.role == UserRole.ADMIN),
        file_path=file_path,
        file_size=len(content),
        file_type=file_ext,
        glb_path=glb_path if glb_path else None,
        status=ModelStatus.PENDING,
        is_published=False,
        uploader_id=user_id,
        volume=model_info['volume'],
        weight=model_info['weight'],
        dimensions_x=model_info['dimensions_x'],
        dimensions_y=model_info['dimensions_y'],
        dimensions_z=model_info['dimensions_z'],
    )
    db.add(model)
    db.flush()
    create_activity_and_commit(
        db=db,
        user_id=user_id,
        type=ActivityType.NEW_MODEL,
        title=f"上传了新模型《{name}》",
        content_preview=description[:150] if description else None,
        model_id=model.id,
    )
    db.refresh(model)
    return ModelResponse.model_validate(model)


@router.put("/{model_id}", response_model=ModelResponse)
def update_model(model_id: int, data: ModelUpdate, db: Session = Depends(get_db)):
    """更新模型信息"""
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(model, key, value)
    
    db.commit()
    db.refresh(model)
    return ModelResponse.model_validate(model)


@router.put("/{model_id}/status")
def update_model_status(
    model_id: int,
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    """更新模型状态（管理员审核用）"""
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    
    try:
        model.status = ModelStatus(status)
        if status == "approved":
            model.is_published = True
            uploader = db.query(User).filter(User.id == model.uploader_id).first()
            if uploader and uploader.role.value in ('admin'):
                model.is_official = True
        db.commit()
        
        if status == "approved":
            if not uploader:
                uploader = db.query(User).filter(User.id == model.uploader_id).first()
            if uploader:
                uploader.nova_coins += 2
                db.commit()
        
        return {"message": "状态已更新", "status": status}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的状态值: {status}")


@router.delete("/{model_id}")
def delete_model(model_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """删除模型（事务包裹，删除失败自动回滚）"""
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    
    if model.uploader_id != user.id and user.role.value not in ('admin'):
        raise HTTPException(status_code=403, detail="无权限删除此模型")
    
    try:
        # 清理关联记录：必须先删子表再删主表（全部在同一个事务中）
        from app.models.order import Order
        related_orders = db.query(Order).filter(Order.model_id == model_id).all()
        if related_orders:
            for order in related_orders:
                order.model_id = None
        
        from app.models.cart import CartItem
        db.query(CartItem).filter(CartItem.model_id == model_id).delete(synchronize_session=False)
        
        from app.models.discussion import ModelComment
        db.query(ModelComment).filter(ModelComment.model_id == model_id).delete(synchronize_session=False)
        
        # 清理收藏
        from app.models.favorite import Favorite
        db.query(Favorite).filter(Favorite.model_id == model_id).delete(synchronize_session=False)
        
        # 删除模型记录
        db.delete(model)
        db.commit()
        
        # 数据库操作成功后，再删除物理文件（失败不影响数据库一致性）
        try:
            if model.file_path and os.path.exists(model.file_path):
                os.remove(model.file_path)
        except Exception as e:
            import logging
            logging.warning(f"删除模型文件失败: {model.file_path}, 错误: {e}")
        
        try:
            if model.glb_path:
                glb_full = os.path.normpath(model.glb_path)
                if os.path.exists(glb_full):
                    os.remove(glb_full)
        except Exception as e:
            import logging
            logging.warning(f"删除GLB文件失败: {model.glb_path}, 错误: {e}")
        
        return {"message": "删除成功"}
        
    except Exception as e:
        db.rollback()
        import logging, traceback
        logging.error(f"删除模型失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.post("/{model_id}/reslice")
def reslice_model(
    model_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """管理员触发重新切片并更新重量（从 BambuStudio 获取精确值）"""
    if user.role.value not in ('admin'):
        raise HTTPException(status_code=403, detail="仅管理员可触发重新切片")
    
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    
    if not model.file_path or not os.path.exists(model.file_path):
        raise HTTPException(status_code=400, detail="模型源文件不存在，无法切片")
    
    import time
    start = time.time()
    
    try:
        slicer_result = bambu_slicer.slice_model(
            model.file_path,
            material=model.material or "pla",
            infill=model.infill or 15,
            layer_height=model.layer_height or 0.20,
        )
        
        elapsed = time.time() - start
        
        if not slicer_result:
            return {
                "success": False,
                "message": "BambuStudio 切片未返回结果",
                "elapsed_seconds": round(elapsed, 1),
            }
        
        old_weight = model.weight
        model.weight = slicer_result['weight_g']
        raw_vol = slicer_result['original_volume_mm3']
        if raw_vol and raw_vol > 0:
            model.volume = round(raw_vol / 1000, 2)
        
        # 重新计算价格
        material_row = db.query(Material).filter(Material.name_en == model.material).first()
        price_per_gram = material_row.price_per_gram if material_row else 0.08
        model.base_price = round(model.weight * price_per_gram, 2)
        
        db.commit()
        
        return {
            "success": True,
            "message": "重新切片成功",
            "old_weight_g": old_weight,
            "new_weight_g": slicer_result['weight_g'],
            "new_base_price": model.base_price,
            "sliced_time_ms": slicer_result.get('sliced_time_ms', 0),
            "elapsed_seconds": round(elapsed, 1),
        }
        
    except Exception as e:
        elapsed = time.time() - start
        return {
            "success": False,
            "message": f"切片失败: {str(e)}",
            "elapsed_seconds": round(elapsed, 1),
        }
