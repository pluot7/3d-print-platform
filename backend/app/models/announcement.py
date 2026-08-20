"""
公告模型
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AnnouncementStatus(str, enum.Enum):
    DRAFT = "draft"           # 草稿
    PUBLISHED = "published"   # 已发布
    ARCHIVED = "archived"     # 已归档


class Announcement(Base):
    """公告"""
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(String(500), default="")           # 摘要
    cover_url = Column(String(500), default="")         # 封面图
    status = Column(Enum(AnnouncementStatus), default=AnnouncementStatus.DRAFT)
    is_pinned = Column(Boolean, default=False)          # 置顶
    view_count = Column(Integer, default=0)
    author = Column(String(100), default="管理员")
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Announcement #{self.id} [{self.status.value}] {self.title}>"
