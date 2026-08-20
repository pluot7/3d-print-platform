"""
购物车 API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.cart import CartItem
from app.models.model import Model3D
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartItemResponse, CartItemListResponse

router = APIRouter(prefix="/api/cart", tags=["购物车"])


@router.get("", response_model=CartItemListResponse)
def list_cart_items(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的购物车列表"""
    items = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id)
        .order_by(CartItem.created_at.desc())
        .all()
    )
    return _build_list_response(items)


def _build_item_response(item: CartItem) -> CartItemResponse:
    """构造带模型信息的响应"""
    model = None
    from sqlalchemy.orm import object_session
    session = object_session(item)
    if session:
        model = session.query(Model3D).filter(Model3D.id == item.model_id).first()
    return CartItemResponse(
        id=item.id,
        user_id=item.user_id,
        model_id=item.model_id,
        material=item.material,
        color=item.color,
        layer_height=item.layer_height,
        infill=item.infill,
        quantity=item.quantity,
        scale=item.scale,
        created_at=item.created_at,
        model_name=model.name if model else "未知模型",
        model_price=model.base_price if model else 0,
        model_glb_path=model.glb_path if model else None,
        model_weight=model.weight if model else None,
        model_dimensions_x=model.dimensions_x if model else None,
        model_dimensions_y=model.dimensions_y if model else None,
        model_dimensions_z=model.dimensions_z if model else None,
    )


def _build_list_response(items: list) -> CartItemListResponse:
    return CartItemListResponse(
        total=len(items),
        items=[_build_item_response(i) for i in items],
    )


@router.post("", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    data: CartItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """添加到购物车（如果已存在同模型同配置，则增加数量）"""
    # 验证模型存在且已上架
    model = db.query(Model3D).filter(Model3D.id == data.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    if not model.is_published:
        raise HTTPException(status_code=400, detail="该模型暂未上架")

    # 检查是否已存在同模型同配置
    existing = (
        db.query(CartItem)
        .filter(
            CartItem.user_id == user.id,
            CartItem.model_id == data.model_id,
            CartItem.material == data.material,
            CartItem.layer_height == data.layer_height,
            CartItem.infill == data.infill,
            CartItem.scale == data.scale,
        )
        .first()
    )

    if existing:
        # 已有相同配置，累加数量
        existing.quantity += data.quantity
        db.commit()
        db.refresh(existing)
        return _build_item_response(existing)

    # 新建
    item = CartItem(
        user_id=user.id,
        model_id=data.model_id,
        material=data.material,
        color=data.color,
        layer_height=data.layer_height,
        infill=data.infill,
        quantity=data.quantity,
        scale=data.scale,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _build_item_response(item)


@router.put("/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: int,
    data: CartItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新购物车项目（数量/缩放等）"""
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="购物车项目不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return _build_item_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_cart(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """从购物车删除"""
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="购物车项目不存在")
    db.delete(item)
    db.commit()


@router.get("/total")
def cart_total(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """计算购物车总价（从前端获取最新模型价格）"""
    items = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id)
        .all()
    )
    total = 0.0
    item_details = []
    for item in items:
        model = db.query(Model3D).filter(Model3D.id == item.model_id).first()
        if not model or not model.base_price:
            continue
        price = float(model.base_price) * (item.scale ** 3) * item.quantity
        total += price
        item_details.append({
            "cart_id": item.id,
            "model_id": item.model_id,
            "model_name": model.name,
            "quantity": item.quantity,
            "scale": item.scale,
            "unit_price": float(model.base_price),
            "subtotal": round(price, 2),
        })
    return {"total": round(total, 2), "items": item_details}


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """清空购物车"""
    db.query(CartItem).filter(CartItem.user_id == user.id).delete()
    db.commit()
