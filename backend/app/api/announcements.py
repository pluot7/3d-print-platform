"""
公告 API
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.announcement import Announcement, AnnouncementStatus
from app.schemas.announcement import (
    AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse, AnnouncementListResponse,
)
from app.api.deps import get_current_user, get_optional_user
from datetime import datetime, timezone
from sqlalchemy import case

router = APIRouter(prefix="/api/announcements", tags=["公告"])

# ============ 公开:获取已发布的公告列表 ============

@router.get("", response_model=AnnouncementListResponse)
def list_announcements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """公开列表:已发布+置顶优先"""
    q = db.query(Announcement)

    # 非管理员只看已发布
    if not user or user.role != UserRole.ADMIN:
        q = q.filter(Announcement.status == AnnouncementStatus.PUBLISHED)
    
    if search:
        like = f"%{search}%"
        q = q.filter(Announcement.title.ilike(like))
    
    total = q.count()
    _epoch = datetime(1980, 1, 1)
    sort_pub = case(
        (Announcement.published_at.is_(None), _epoch),
        else_=Announcement.published_at,
    ).desc()
    items = (
        q.order_by(Announcement.is_pinned.desc(), sort_pub)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return AnnouncementListResponse(total=total, items=items)

# ============ 公开:获取最新 N 条公告速览 ============

@router.get("/brief", response_model=AnnouncementListResponse)
def list_brief_announcements(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """公开速览(首页小卡片用)"""
    _epoch = datetime(1980, 1, 1)
    sort_pub = case(
        (Announcement.published_at.is_(None), _epoch),
        else_=Announcement.published_at,
    ).desc()
    items = (
        db.query(Announcement)
        .filter(Announcement.status == AnnouncementStatus.PUBLISHED)
        .order_by(Announcement.is_pinned.desc(), sort_pub)
        .limit(limit)
        .all()
    )
    return AnnouncementListResponse(total=len(items), items=items)

# ============ 公开:查看单条公告(+1 阅读计数) ============

@router.get("/{announcement_id}", response_model=AnnouncementResponse)
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="公告不存在")
    if a.status != AnnouncementStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="公告不存在")

    # 阅读计数 +1
    a.view_count = (a.view_count or 0) + 1
    db.commit()
    db.refresh(a)
    return a

# ============ 管理员:创建公告 ============

@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(
    data: AnnouncementCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可操作")

    a = Announcement(**data.model_dump())
    if data.status == AnnouncementStatus.PUBLISHED:
        a.published_at = datetime.now(timezone.utc)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a

# ============ 管理员:更新公告 ============

@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可操作")

    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="公告不存在")

    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(a, key, val)

    # 如果是首次发布,设置发布时间
    if data.status == AnnouncementStatus.PUBLISHED and not a.published_at:
        a.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(a)
    return a

# ============ 管理员:删除公告 ============

@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可操作")

    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="公告不存在")
    db.delete(a)
    db.commit()
