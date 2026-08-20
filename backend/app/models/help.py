"""帮助中心模型"""
from sqlalchemy import Column, Integer, String, Text, Boolean
from app.core.database import Base

class HelpArticle(Base):
    """帮助中心文章"""
    __tablename__ = "help_articles"

    id = Column(Integer, primary_key=True, index=True)
    section = Column(String(50), nullable=False, comment="分区")
    title = Column(String(200), nullable=False, comment="标题")
    content = Column(Text, comment="内容")
    sort_order = Column(Integer, default=0, comment="排序")
    is_active = Column(Boolean, default=True)
