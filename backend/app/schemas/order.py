from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


# ============ 支付相关 ============

class PayMethod(str, Enum):
    BALANCE = "balance"
    WECHAT = "wechat"
    ALIPAY = "alipay"


class PayOrderRequest(BaseModel):
    method: PayMethod
    nova_coins: int = Field(default=0, ge=0, description="使用的Nova豆数量")


# ============ 订单相关 ============

class PrintConfig(BaseModel):
    material: str = "树脂"
    color: str = "白色"
    layer_height: float = 0.1
    infill: int = Field(20, ge=0, le=100)
    quantity: int = Field(1, ge=1)
    scale: Optional[float] = Field(default=1.0, ge=0.1, le=3.0)  # 等比例缩放，默认1.0（原始尺寸）


class OrderCreate(BaseModel):
    model_id: Optional[int] = None
    print_config: PrintConfig
    recipient_name: str = Field(..., min_length=1, max_length=100)
    recipient_phone: str = Field(..., min_length=1, max_length=20)
    shipping_address: str = Field(..., min_length=1)
    note: Optional[str] = None
    use_balance: bool = Field(default=True, description="是否优先使用余额支付")
    use_nova: bool = Field(default=True, description="是否使用Nova豆折扣")


class OrderResponse(BaseModel):
    id: int
    order_no: str
    status: Optional[str] = None
    model_id: Optional[int] = None
    model_name: Optional[str] = None
    note: Optional[str] = None
    print_config: Optional[Dict[str, Any]] = None
    model_price: Optional[float] = None
    material_fee: Optional[float] = None
    shipping_fee: Optional[float] = None
    total_price: Optional[float] = None
    recipient_name: str
    recipient_phone: str
    shipping_address: str
    payment_method: Optional[str] = None
    tracking_no: Optional[str] = None
    nova_coins_used: Optional[int] = None
    nova_discount: Optional[float] = None
    balance_paid: Optional[float] = None
    created_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    total: int
    items: List[OrderResponse]


class PayOrderRequest(BaseModel):
    method: str = Field(..., description="支付方式: balance/wechat/alipay")
    use_nova: bool = Field(default=True, description="是否使用Nova豆折扣")
    nova_coins_override: Optional[int] = Field(default=None, description="强制指定使用的Nova豆数量（不计折扣上限）")


class PayOrderResponse(BaseModel):
    order_id: int
    order_no: str
    method: str
    total_price: float
    nova_discount: float
    balance_paid: float
    remaining: float
    status: str  # paid / partial / pending_online
    message: str
    qr_data: Optional[str] = None  # 模拟二维码数据

    class Config:
        from_attributes = True


class PriceCalculateRequest(BaseModel):
    model_id: Optional[int] = None
    file_size: Optional[int] = None  # bytes
    dimensions_x: Optional[float] = None
    dimensions_y: Optional[float] = None
    dimensions_z: Optional[float] = None
    material: str = "树脂"
    layer_height: float = 0.1
    infill: int = Field(20, ge=0, le=100)
    quantity: int = Field(1, ge=1)
    scale: Optional[float] = Field(default=1.0, ge=0.1, le=3.0)  # 等比例缩放


class PriceResponse(BaseModel):
    model_price: float
    material_fee: float
    shipping_fee: float
    total_price: float
