from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class OrderStatus(str, enum.Enum):
    PENDING = "pending"           # 待支付
    PAID = "paid"                 # 已支付
    PRINTING = "printing"          # 打印中
    QUALITY_CHECK = "quality_check"  # 质检中
    SHIPPED = "shipped"           # 已发货
    COMPLETED = "completed"       # 已完成
    CANCELLED = "cancelled"       # 已取消


class PaymentMethod(str, enum.Enum):
    WECHAT = "wechat"             # 微信支付
    ALIPAY = "alipay"             # 支付宝


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_no = Column(String(50), unique=True, index=True, nullable=False)  # 订单号

    # 关联
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=True)

    # 状态
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)

    # 打印参数（JSON 存储复杂配置）
    print_config = Column(JSON, nullable=True)
    """
    {
        "material": "树脂",
        "color": "白色",
        "layer_height": 0.05,
        "infill": 20,
        "quantity": 1
    }
    """

    # 价格
    model_price = Column(Float, default=0)     # 模型费用
    material_fee = Column(Float, default=0)    # 材料费
    shipping_fee = Column(Float, default=0)     # 运费
    total_price = Column(Float, nullable=False)  # 总价

    # 收货信息
    recipient_name = Column(String(100), nullable=False)
    recipient_phone = Column(String(20), nullable=False)
    shipping_address = Column(Text, nullable=False)

    # 支付
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    transaction_id = Column(String(100), nullable=True)

    # 物流
    tracking_no = Column(String(100), nullable=True)
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # 备注
    note = Column(Text, nullable=True)

    # 余额支付相关
    nova_coins_used = Column(Integer, default=0, nullable=True)  # 使用的Nova豆数
    nova_discount = Column(Float, default=0.0, nullable=True)    # Nova豆折扣金额
    balance_paid = Column(Float, default=0.0, nullable=True)     # 余额支付金额

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Order {self.order_no} ({self.status.value})>"
