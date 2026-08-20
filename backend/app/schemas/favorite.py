"""收藏Schema"""
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class FavoriteModelBrief(BaseModel):
    """收藏列表中模型的精简信息"""
    id: int
    name: str
    category: Optional[str] = None
    image_url: Optional[str] = None
    glb_path: Optional[str] = None
    price: Optional[float] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class FavoriteItem(BaseModel):
    id: int
    model: FavoriteModelBrief
    created_at: datetime

    class Config:
        from_attributes = True


class FavoriteListResponse(BaseModel):
    total: int
    items: List[FavoriteItem]


class FavoriteItem(BaseModel):
    id: int
    model: FavoriteModelBrief
    created_at: datetime

    class Config:
        from_attributes = True


class FavoriteListResponse(BaseModel):
    total: int
    items: List[FavoriteItem]
