from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============ 3D模型相关 ============

class ModelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = "other"
    material: str = "pla"  # 默认 PLA
    layer_height: Optional[float] = None
    infill: Optional[int] = Field(None, ge=0, le=100)
    base_price: float = Field(0, ge=0)
    is_official: bool = False


class ModelCreate(ModelBase):
    pass


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    material: Optional[str] = None
    layer_height: Optional[float] = None
    infill: Optional[int] = Field(None, ge=0, le=100)
    base_price: Optional[float] = None
    is_published: Optional[bool] = None
    weight: Optional[float] = None
    volume: Optional[float] = None
    dimensions_x: Optional[float] = None
    dimensions_y: Optional[float] = None
    dimensions_z: Optional[float] = None


class ModelResponse(ModelBase):
    id: int
    category: Optional[str] = None
    status: Optional[str] = None
    base_price: Optional[float] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    material: Optional[str] = None  # 覆盖基类定义，允许NULL (inherited from ModelBase)
    glb_path: Optional[str] = None
    preview_images: Optional[str] = None
    dimensions_x: Optional[float] = None
    dimensions_y: Optional[float] = None
    dimensions_z: Optional[float] = None
    volume: Optional[float] = None  # cm³
    weight: Optional[float] = None  # g
    is_published: Optional[bool] = None
    uploader_id: Optional[int] = None
    download_count: Optional[int] = None
    view_count: Optional[int] = None
    rating: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ModelListResponse(BaseModel):
    total: int
    items: List[ModelResponse]
