from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.notification import NotificationType, ActivityType


# ============ 通知 =============

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: NotificationType
    title: str
    content: Optional[str] = None
    is_read: bool
    related_user_id: Optional[int] = None
    related_model_id: Optional[int] = None
    related_discussion_id: Optional[int] = None
    related_comment_id: Optional[int] = None
    related_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    items: List[NotificationResponse]


class MarkReadRequest(BaseModel):
    ids: Optional[List[int]] = None  # None = 标记全部已读


# ============ 用户通知偏好 =============

class NotificationPreferences(BaseModel):
    notify_activities: bool = True
    notify_messages: bool = True


# ============ 关注 =============

class FollowUserBrief(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class FollowResponse(BaseModel):
    id: int
    user: FollowUserBrief
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FollowListResponse(BaseModel):
    total: int
    items: List[FollowResponse]


# ============ 动态 =============

class ActivityResponse(BaseModel):
    id: int
    user_id: int
    username: str = ''
    avatar_url: Optional[str] = None
    type: ActivityType
    title: str
    content_preview: Optional[str] = None
    discussion_id: Optional[int] = None
    model_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ActivityListResponse(BaseModel):
    total: int
    items: List[ActivityResponse]


# ============ 用户主页信息 =============

class UserProfileResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    follower_count: int = 0
    following_count: int = 0
    discussion_count: int = 0
    model_count: int = 0
    is_following: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ 私信 =============

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_username: str = ""
    sender_avatar: Optional[str] = None
    content: str
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    receiver_id: int
    content: str


class ConversationBrief(BaseModel):
    """会话摘要（用于会话列表）"""
    id: int
    other_user: FollowUserBrief
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    is_muted: bool = False

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    total: int
    items: List[ConversationBrief]


class MessageListResponse(BaseModel):
    total: int
    items: List[MessageResponse]


class UnreadConversationCount(BaseModel):
    """所有会话的未读总数（不包含通知等）"""
    total_unread: int


class UnreadCountResponse(BaseModel):
    """统一未读数响应"""
    notifications: int = 0
    conversations: int = 0
