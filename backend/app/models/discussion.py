from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DiscussionCategory(str, enum.Enum):
    GENERAL = "general"        # 综合
    HELP = "help"              # 求助
    SHOWCASE = "showcase"      # 作品展示
    TECH = "tech"              # 技术交流


class Discussion(Base):
    """社区讨论区主题帖"""
    __tablename__ = "discussions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)           # Markdown 支持
    category = Column(Enum(DiscussionCategory), default=DiscussionCategory.GENERAL)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    is_pinned = Column(Boolean, default=False)      # 置顶
    is_locked = Column(Boolean, default=False)     # 锁定（禁止回复）
    view_count = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)        # 缓存计数，方便列表展示

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    user = relationship("User", primaryjoin="Discussion.user_id == User.id", foreign_keys=[user_id], lazy="joined")
    replies = relationship("DiscussionReply", back_populates="discussion", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Discussion #{self.id} [{self.category.value}] {self.title}>"


class DiscussionReply(Base):
    """社区讨论区回帖（支持嵌套回复）"""
    __tablename__ = "discussion_replies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    discussion_id = Column(Integer, ForeignKey("discussions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("discussion_replies.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    user = relationship("User", primaryjoin="DiscussionReply.user_id == User.id", foreign_keys=[user_id], lazy="joined")
    discussion = relationship("Discussion", back_populates="replies")
    parent = relationship("DiscussionReply", remote_side=[id], back_populates="replies")
    replies = relationship("DiscussionReply", back_populates="parent", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<DiscussionReply #{self.id} to Discussion #{self.discussion_id}>"


class ModelComment(Base):
    """模型详情页评论（支持嵌套回复）"""
    __tablename__ = "model_comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_id = Column(Integer, ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("model_comments.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    user = relationship("User", primaryjoin="ModelComment.user_id == User.id", foreign_keys=[user_id], lazy="joined")
    model = relationship("Model3D", primaryjoin="ModelComment.model_id == Model3D.id", foreign_keys=[model_id], lazy="joined")
    parent = relationship("ModelComment", remote_side=[id], back_populates="replies")
    replies = relationship("ModelComment", back_populates="parent", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ModelComment #{self.id} on Model #{self.model_id}>"
