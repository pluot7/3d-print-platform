from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AddressBase(BaseModel):
    recipient_name: str = Field(..., min_length=1, max_length=50, description="收货人姓名")
    recipient_phone: str = Field(..., min_length=1, max_length=20, description="收货人手机号")
    province: str = Field(..., min_length=1, max_length=30, description="省")
    city: str = Field(..., min_length=1, max_length=30, description="市")
    district: str = Field(..., min_length=1, max_length=30, description="区/县")
    detail_address: str = Field(..., min_length=1, max_length=200, description="详细地址")
    is_default: bool = Field(False, description="是否设为默认地址")


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    recipient_name: Optional[str] = Field(None, min_length=1, max_length=50)
    recipient_phone: Optional[str] = Field(None, min_length=1, max_length=20)
    province: Optional[str] = Field(None, min_length=1, max_length=30)
    city: Optional[str] = Field(None, min_length=1, max_length=30)
    district: Optional[str] = Field(None, min_length=1, max_length=30)
    detail_address: Optional[str] = Field(None, min_length=1, max_length=200)
    is_default: Optional[bool] = None


class AddressResponse(AddressBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @property
    def full_address(self) -> str:
        return f"{self.province}{self.city}{self.district}{self.detail_address}"
