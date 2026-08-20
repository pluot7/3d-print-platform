from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.discussion import DiscussionCategory


# ============ 用户信息（用于嵌入到其他响应中）============

class UserBrief(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


# ============ 讨论区主题帖 =============

class DiscussionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category: DiscussionCategory = DiscussionCategory.GENERAL


class DiscussionCreate(DiscussionBase):
    pass


class DiscussionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[DiscussionCategory] = None
    is_pinned: Optional[bool] = None
    is_locked: Optional[bool] = None


class DiscussionResponse(DiscussionBase):
    id: int
    user_id: int
    author: UserBrief
    is_pinned: bool
    is_locked: bool
    view_count: int
    reply_count: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DiscussionListResponse(BaseModel):
    total: int
    items: List[DiscussionResponse]


# ============ 讨论区回帖 =============

class ReplyBase(BaseModel):
    content: str = Field(..., min_length=1)


class ReplyCreate(ReplyBase):
    parent_id: Optional[int] = None


class ReplyResponse(ReplyBase):
    id: int
    discussion_id: int
    user_id: int
    author: UserBrief
    parent_id: Optional[int] = None
    reply_to_author: Optional[UserBrief] = None
    replies: 'List[ReplyResponse]' = []
    discussion_title: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReplyListResponse(BaseModel):
    total: int
    items: List[ReplyResponse]


# ============ 模型评论 =============

class ModelCommentBase(BaseModel):
    content: str = Field(..., min_length=1)


class ModelCommentCreate(ModelCommentBase):
    parent_id: Optional[int] = None


class ModelCommentResponse(ModelCommentBase):
    id: int
    model_id: int
    user_id: int
    parent_id: Optional[int] = None
    author: UserBrief
    reply_to_author: Optional[UserBrief] = None  # 被回复者的简要信息
    model_name: Optional[str] = None
    replies: 'List[ModelCommentResponse]' = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ModelCommentListResponse(BaseModel):
    total: int
    items: List[ModelCommentResponse]  # 仅返回顶级评论，子评论嵌套在内
