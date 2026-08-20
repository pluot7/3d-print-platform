from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Float, Numeric
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), default=UserRole.USER, nullable=False)
    avatar_url = Column(String(500), nullable=True)  # 头像URL，不设则用默认
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    balance = Column(Numeric(12, 2), default=0.00, nullable=False)  # 余额，精确到分
    nova_coins = Column(Integer, default=0, nullable=False)  # Nova豆，整数
    # 通知偏好设置
    notify_activities = Column(Boolean, default=True, nullable=False)  # 是否接收关注者动态推送
    notify_messages = Column(Boolean, default=True, nullable=False)    # 是否接收私信推送

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User {self.username} ({self.role.value})>"
