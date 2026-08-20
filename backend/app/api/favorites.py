"""收藏API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from sqlalchemy.orm import Session

from sqlalchemy.orm import joinedload
from app.core.database import get_db
from app.models.favorite import Favorite
from app.models.model import Model3D
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.favorite import FavoriteItem, FavoriteModelBrief, FavoriteListResponse

router = APIRouter(prefix="/api/favorites", tags=["收藏"])


def _model_to_brief(m: Model3D) -> FavoriteModelBrief:
    cat = None
    if m.category:
        try: cat = m.category.value
        except: cat = str(m.category)
    st = None
    if m.status:
        try: st = m.status.value
        except: st = str(m.status).lower()
    return FavoriteModelBrief(
        id=m.id,
        name=m.name,
        category=cat,
        image_url=m.preview_images,
        glb_path=m.glb_path,
        price=m.base_price,
        status=st,
    )


@router.get("", response_model=FavoriteListResponse)
def get_favorites(
    sort: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的收藏列表"""
    q = db.query(Favorite).filter(Favorite.user_id == user.id)
    if sort == "oldest":
        order = Favorite.created_at.asc()
    else:
        order = Favorite.created_at.desc()
    total = q.count()
    items = (
        q.options(joinedload(Favorite.model_rel))
        .order_by(order)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return FavoriteListResponse(
        total=total,
        items=[
            FavoriteItem(
                id=f.id,
                model=_model_to_brief(f.model_rel),
                created_at=f.created_at,
            )
            for f in items
            if f.model_rel
        ],
    )


@router.post("/{model_id}", response_model=dict)
def add_favorite(
    model_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """收藏模型"""
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")

    existing = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.model_id == model_id,
    ).first()
    if existing:
        return {"ok": True, "message": "已收藏"}

    f = Favorite(user_id=user.id, model_id=model_id)
    db.add(f)
    db.commit()
    return {"ok": True, "message": "收藏成功"}


@router.delete("/{model_id}", response_model=dict)
def remove_favorite(
    model_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """取消收藏"""
    f = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.model_id == model_id,
    ).first()
    if not f:
        raise HTTPException(status_code=404, detail="未收藏")
    db.delete(f)
    db.commit()
    return {"ok": True, "message": "已取消收藏"}


@router.get("/check/{model_id}", response_model=dict)
def check_favorite(
    model_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """检查是否已收藏"""
    f = db.query(Favorite).filter(
        Favorite.user_id == user.id,
        Favorite.model_id == model_id,
    ).first()
    return {"favorited": f is not None}
