"""
社区讨论/帖子 API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional, List
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.discussion import Discussion, DiscussionReply
from app.schemas.discussion import DiscussionCreate, DiscussionUpdate, DiscussionResponse, ReplyCreate, ReplyResponse
from app.api.deps import get_current_user, get_optional_user
from app.api.notifications import create_activity_and_commit
from app.models.notification import ActivityType

router = APIRouter(prefix="/api/discussions", tags=["讨论"])

categoryNames = {
    "general": "综合讨论",
    "help": "求助问答",
    "showcase": "作品展示",
    "feedback": "建议反馈",
}


@router.get("")
def list_discussions(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """公开获取帖子列表（置顶优先 + 最新）"""
    q = db.query(Discussion).options(joinedload(Discussion.author))
    if category:
        q = q.filter(Discussion.category == category)
    if search:
        like = f"%{search}%"
        q = q.filter(Discussion.title.ilike(like))
    total = q.count()
    items = (
        q.order_by(Discussion.is_pinned.desc(), Discussion.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    result = []
    for d in items:
        DiscussionReply_count = db.query(DiscussionReply).filter(DiscussionReply.discussion_id == d.id).count()
        result.append({
            "id": d.id,
            "title": d.title,
            "category": d.category,
            "created_at": str(d.created_at) if d.created_at else None,
            "author": {"username": d.author.username} if d.author else {"username": "匿名"},
            "DiscussionReply_count": DiscussionReply_count,
            "is_pinned": d.is_pinned,
            "is_locked": d.is_locked,
        })
    return {"total": total, "items": result}


@router.get("/{discussion_id}")
def get_discussion(
    discussion_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """获取帖子详情（含回帖）"""
    d = db.query(Discussion).options(joinedload(Discussion.author)).filter(Discussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="帖子不存在")
    
    replies = (
        db.query(DiscussionReply).options(joinedload(DiscussionReply.author))
        .filter(DiscussionReply.discussion_id == discussion_id)
        .order_by(DiscussionReply.created_at.asc())
        .all()
    )
    
    return {
        "id": d.id,
        "title": d.title,
        "content": d.content,
        "category": d.category,
        "created_at": str(d.created_at) if d.created_at else None,
        "author": {"username": d.author.username} if d.author else {"username": "匿名"},
        "is_pinned": d.is_pinned,
        "is_locked": d.is_locked,
        "replies": [
            {
                "id": r.id,
                "content": r.content,
                "created_at": str(r.created_at) if r.created_at else None,
                "author": {"username": r.author.username} if r.author else {"username": "匿名"},
            }
            for r in replies
        ],
    }


@router.post("")
def create_discussion(
    data: DiscussionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """用户发帖"""
    d = Discussion(
        title=data.title,
        content=data.content,
        category=data.category or "general",
        user_id=user.id,
    )
    db.add(d)
    db.flush()
    create_activity_and_commit(
        db=db,
        user_id=user.id,
        type=ActivityType.NEW_DISCUSSION,
        title=f"发布了新帖子《{d.title}》",
        content_preview=data.content[:150] if data.content else None,
    )
    db.refresh(d)
    return {
        "id": d.id,
        "title": d.title,
        "category": d.category,
        "created_at": str(d.created_at) if d.created_at else None,
        "author": {"username": user.username},
    }


@router.put("/{discussion_id}")
def update_discussion(
    discussion_id: int,
    data: DiscussionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新帖子（管理员可更新任何帖子，用户只能更新自己的）"""
    d = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if user.role != UserRole.ADMIN and d.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权限编辑")
    
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(d, key, val)
    db.commit()
    db.refresh(d)
    return {"message": "更新成功"}


@router.delete("/{discussion_id}")
def delete_discussion(
    discussion_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除帖子（管理员或帖子作者）"""
    d = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if user.role != UserRole.ADMIN and d.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权限删除")
    db.delete(d)
    db.commit()
    return {"message": "删除成功"}


# ============ 回帖 ============

@router.post("/{discussion_id}/replies")
def create_reply(
    discussion_id: int,
    data: ReplyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """用户回帖"""
    d = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if d.is_locked:
        raise HTTPException(status_code=403, detail="帖子已锁定，无法回复")

    r = DiscussionReply(
        discussion_id=discussion_id,
        user_id=user.id,
        content=data.content,
        parent_id=data.parent_id,
    )
    db.add(r)
    db.flush()
    create_activity_and_commit(
        db=db,
        user_id=user.id,
        type=ActivityType.NEW_REPLY,
        title=f"回复了帖子《{d.title}》",
        content_preview=data.content[:150] if data.content else None,
    )
    db.refresh(r)
    return {
        "id": r.id,
        "content": r.content,
        "created_at": str(r.created_at) if r.created_at else None,
        "author": {"username": user.username},
    }


@router.delete("/replies/{DiscussionReply_id}")
def delete_reply(
    DiscussionReply_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除回帖（管理员或回帖作者）"""
    r = db.query(DiscussionReply).filter(DiscussionReply.id == DiscussionReply_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="回帖不存在")
    if user.role != UserRole.ADMIN and r.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权限删除")
    db.delete(r)
    db.commit()
    return {"message": "删除成功"}


@router.get("/{discussion_id}/replies")
def list_replies(
    discussion_id: int,
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """获取帖子回帖列表"""
    q = db.query(DiscussionReply).options(joinedload(DiscussionReply.author)).filter(DiscussionReply.discussion_id == discussion_id)
    if search:
        like = f"%{search}%"
        q = q.filter(DiscussionReply.content.ilike(like))
    total = q.count()
    items = q.order_by(DiscussionReply.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "content": r.content,
                "created_at": str(r.created_at) if r.created_at else None,
                "author": {"username": r.author.username} if r.author else {"username": "匿名"},
            }
            for r in items
        ],
        "page": page,
        "page_size": page_size,
    }


# ============ 管理员批量获取 ============

@router.get("/all/list")
def admin_list_discussions(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """管理员获取所有帖子列表"""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可查看")
    
    q = db.query(Discussion).options(joinedload(Discussion.author))
    if search:
        like = f"%{search}%"
        q = q.filter(Discussion.title.ilike(like))
    total = q.count()
    items = q.order_by(Discussion.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    result = []
    for d in items:
        DiscussionReply_count = db.query(DiscussionReply).filter(DiscussionReply.discussion_id == d.id).count()
        result.append({
            "id": d.id,
            "title": d.title,
            "category": d.category,
            "created_at": str(d.created_at) if d.created_at else None,
            "author": {"username": d.author.username} if d.author else {"username": "匿名"},
            "DiscussionReply_count": DiscussionReply_count,
            "is_pinned": d.is_pinned,
            "is_locked": d.is_locked,
        })
    return {"total": total, "items": result}


@router.get("/all/replies")
def admin_list_replies(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """管理员获取所有回帖列表"""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可查看")
    
    q = db.query(DiscussionReply).options(joinedload(DiscussionReply.author))
    if search:
        like = f"%{search}%"
        q = q.filter(DiscussionReply.content.ilike(like))
    total = q.count()
    items = q.order_by(DiscussionReply.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    result = []
    for r in items:
        disc = db.query(Discussion).filter(Discussion.id == r.discussion_id).first()
        result.append({
            "id": r.id,
            "content": r.content,
            "created_at": str(r.created_at) if r.created_at else None,
            "author": {"username": r.author.username} if r.author else {"username": "匿名"},
            "discussion_title": disc.title if disc else None,
            "discussion_id": r.discussion_id,
        })
    return {"total": total, "items": result}

