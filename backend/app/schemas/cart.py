"""
购物车 Pydantic schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CartItemBase(BaseModel):
    model_id: int
    material: str = "PLA"
    color: str = "白色"
    layer_height: float = 0.2
    infill: int = Field(20, ge=0, le=100)
    quantity: int = Field(1, ge=1)
    scale: float = Field(1.0, ge=0.1, le=3.0)


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=1)
    scale: Optional[float] = Field(None, ge=0.1, le=3.0)
    material: Optional[str] = None
    color: Optional[str] = None
    layer_height: Optional[float] = None


class CartItemResponse(CartItemBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None

    # 展平模型信息
    model_name: Optional[str] = None
    model_price: Optional[float] = None
    model_glb_path: Optional[str] = None
    model_weight: Optional[float] = None
    model_dimensions_x: Optional[float] = None
    model_dimensions_y: Optional[float] = None
    model_dimensions_z: Optional[float] = None

    class Config:
        from_attributes = True


class CartItemListResponse(BaseModel):
    total: int
    items: List[CartItemResponse]
