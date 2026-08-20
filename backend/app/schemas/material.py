"""材料价格相关Schema"""
from typing import List, Optional
from pydantic import BaseModel


class MaterialResponse(BaseModel):
    id: int
    name_zh: str
    name_en: str
    price_per_gram: float
    density: float
    description: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class MaterialListResponse(BaseModel):
    total: int
    items: List[MaterialResponse]


class MaterialUpdateRequest(BaseModel):
    name_zh: Optional[str] = None
    name_en: Optional[str] = None
    price_per_gram: Optional[float] = None
    density: Optional[float] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    icon: Optional[str] = None


class MaterialCreateRequest(BaseModel):
    name_zh: str
    name_en: str
    price_per_gram: float
    density: float = 1.0
    description: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
