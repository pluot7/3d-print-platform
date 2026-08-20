"""材料价格API"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.material import Material
from app.schemas.material import (
    MaterialResponse,
    MaterialListResponse,
    MaterialUpdateRequest,
    MaterialCreateRequest,
)
from app.api.deps import get_current_user, get_admin_user

router = APIRouter(prefix="/api/materials", tags=["材料价格"])


def _to_response(m: Material) -> MaterialResponse:
    return MaterialResponse(
        id=m.id,
        name_zh=m.name_zh,
        name_en=m.name_en,
        price_per_gram=m.price_per_gram,
        density=m.density,
        description=m.description,
        pros=m.pros,
        cons=m.cons,
        icon=m.icon,
        is_active=m.is_active,
        sort_order=m.sort_order,
    )


@router.get("", response_model=MaterialListResponse)
def get_materials(db: Session = Depends(get_db)):
    """获取启用的材料列表（公开）"""
    items = (
        db.query(Material)
        .filter(Material.is_active == True)
        .order_by(Material.sort_order)
        .all()
    )
    return MaterialListResponse(
        total=len(items),
        items=[_to_response(m) for m in items],
    )


@router.get("/all", response_model=MaterialListResponse)
def get_all_materials(
    _=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """获取所有材料（管理员）"""
    items = db.query(Material).order_by(Material.sort_order).all()
    return MaterialListResponse(
        total=len(items),
        items=[_to_response(m) for m in items],
    )


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    data: MaterialUpdateRequest,
    _=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """更新材料（管理员）"""
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="材料不存在")

    update_data = data.model_dump(exclude_none=True)
    for key, val in update_data.items():
        setattr(mat, key, val)
    db.commit()
    db.refresh(mat)
    return _to_response(mat)


@router.post("", response_model=MaterialResponse)
def create_material(
    data: MaterialCreateRequest,
    _=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """创建材料（管理员）"""
    mat = Material(
        name_zh=data.name_zh,
        name_en=data.name_en,
        price_per_gram=data.price_per_gram,
        density=data.density,
        description=data.description,
        pros=data.pros,
        cons=data.cons,
        icon=data.icon,
        is_active=True,
        sort_order=data.sort_order,
    )
    db.add(mat)
    db.commit()
    db.refresh(mat)
    return _to_response(mat)


@router.delete("/{material_id}")
def delete_material(
    material_id: int,
    _=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """删除材料（管理员）"""
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="材料不存在")
    db.delete(mat)
    db.commit()
    return {"ok": True}
