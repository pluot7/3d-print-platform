from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class NotificationType(str, enum.Enum):
    """通知类型"""
    COMMENT = "comment"                 # 有人评论了我的模型
    COMMENT_REPLY = "comment_reply"     # 有人回复了我的评论
    DISCUSSION_REPLY = "discussion_reply"  # 有人回复了我的帖子
    FOLLOW = "follow"                   # 有人关注了我
    FOLLOW_ACTIVITY = "follow_activity"  # 关注的人发布了动态
    MESSAGE = "message"                  # 私信
    SYSTEM = "system"                   # 系统通知
    ORDER_STATUS = "order_status"       # 订单状态变更


class Notification(Base):
    """通知/消息"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(20), nullable=False)

    # 内容
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)

    # 关联信息（可空，用于前端跳转）
    related_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    related_model_id = Column(Integer, nullable=True)
    related_discussion_id = Column(Integer, nullable=True)
    related_comment_id = Column(Integer, nullable=True)
    related_url = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    user = relationship("User", primaryjoin="Notification.user_id == User.id", foreign_keys=[user_id], lazy="joined")
    related_user = relationship("User", primaryjoin="Notification.related_user_id == User.id", foreign_keys=[related_user_id], lazy="joined")

    def __repr__(self):
        return f"<Notification #{self.id} ({self.type.value}) to User #{self.user_id}>"


class Follow(Base):
    """用户关注关系"""
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    follower = relationship("User", primaryjoin="Follow.follower_id == User.id", foreign_keys=[follower_id], lazy="joined")
    following = relationship("User", primaryjoin="Follow.following_id == User.id", foreign_keys=[following_id], lazy="joined")

    def __repr__(self):
        return f"<Follow #{self.follower_id} → #{self.following_id}>"


class ActivityType(str, enum.Enum):
    """动态类型"""
    NEW_DISCUSSION = "new_discussion"    # 发布了新帖子
    NEW_MODEL = "new_model"              # 上传了新模型


class Activity(Base):
    """用户动态（聚合时间线）"""
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(ActivityType), nullable=False)

    # 关联内容
    title = Column(String(200), nullable=False)
    content_preview = Column(String(300), nullable=True)
    discussion_id = Column(Integer, nullable=True)
    model_id = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    user = relationship("User", primaryjoin="Activity.user_id == User.id", foreign_keys=[user_id], lazy="joined")

    def __repr__(self):
        return f"<Activity #{self.id} ({self.type.value}) by User #{self.user_id}>"


# ============ 私信 =============

class Conversation(Base):
    """会话"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # 私聊双方用户ID，按大小排序保证唯一性
    user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    last_message_id = Column(Integer, nullable=True)
    last_message_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user1 = relationship("User", primaryjoin="Conversation.user1_id == User.id", foreign_keys=[user1_id], lazy="joined")
    user2 = relationship("User", primaryjoin="Conversation.user2_id == User.id", foreign_keys=[user2_id], lazy="joined")

    def __repr__(self):
        return f"<Conversation #{self.id}: #{self.user1_id} ↔ #{self.user2_id}>"


class Message(Base):
    """私信消息"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", primaryjoin="Message.sender_id == User.id", foreign_keys=[sender_id], lazy="joined")
    conversation = relationship("Conversation", backref="messages")

    def __repr__(self):
        return f"<Message #{self.id} in Conversation #{self.conversation_id}>"


class UserConversationStatus(Base):
    """用户对会话的个性化状态（已读数等）"""
    __tablename__ = "user_conversation_status"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    last_read_message_id = Column(Integer, nullable=True)  # 该用户最后已读的消息ID
    is_muted = Column(Boolean, default=False, nullable=False)  # 是否静音
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", lazy="joined")
    conversation = relationship("Conversation", lazy="joined")

    def __repr__(self):
        return f"<UserConvStatus #{self.user_id} in #{self.conversation_id}>"

