"""
购物车模型
"""
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    model_id = Column(Integer, ForeignKey("models.id", ondelete="CASCADE"), nullable=False)

    # 打印配置快照
    material = Column(String(50), default="PLA")
    color = Column(String(50), default="白色")
    layer_height = Column(Float, default=0.2)
    infill = Column(Integer, default=20)
    quantity = Column(Integer, default=1)
    scale = Column(Float, default=1.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    user = relationship("User", backref="cart_items")
    model = relationship("Model3D", backref="cart_items")
