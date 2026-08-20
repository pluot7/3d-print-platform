from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 收货人信息
    recipient_name = Column(String(50), nullable=False, comment="收货人姓名")
    recipient_phone = Column(String(20), nullable=False, comment="收货人手机号")

    # 地址信息
    province = Column(String(30), nullable=False, comment="省")
    city = Column(String(30), nullable=False, comment="市")
    district = Column(String(30), nullable=False, comment="区/县")
    detail_address = Column(String(200), nullable=False, comment="详细地址")

    # 是否默认
    is_default = Column(Boolean, default=False, nullable=False, comment="是否默认地址")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Address {self.id}: {self.recipient_name} {self.province}{self.city}{self.district}>"
