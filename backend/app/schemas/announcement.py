from __future__ import annotations
"""
公告 Schema
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.announcement import AnnouncementStatus


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    summary: Optional[str] = ""
    cover_url: Optional[str] = ""
    status: Optional[AnnouncementStatus] = AnnouncementStatus.DRAFT
    author: Optional[str] = "管理员"
    is_pinned: Optional[bool] = False


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    cover_url: Optional[str] = None
    status: Optional[AnnouncementStatus] = None
    is_pinned: Optional[bool] = None
    author: Optional[str] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    summary: Optional[str] = None
    cover_url: Optional[str] = None
    status: AnnouncementStatus
    is_pinned: bool
    view_count: int
    author: str
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnnouncementListResponse(BaseModel):
    total: int
    items: List[AnnouncementResponse]
