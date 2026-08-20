"""
模型评论/评价 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.discussion import ModelComment
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/model-comments", tags=["模型评论"])


def comment_to_response(c: ModelComment) -> dict:
    """转换 ModelComment 对象为响应格式（包含用户信息与 replies）"""
    author_name = c.user.username if c.user else "匿名"
    return {
        "id": c.id,
        "model_id": c.model_id,
        "content": c.content,
        "author_name": author_name,
        "user_id": c.user_id,
        "created_at": str(c.created_at) if c.created_at else None,
        "parent_id": c.parent_id,
    }


@router.get("/model/{model_id}")
def get_model_comments(
    model_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """获取某个模型的评论（公开）"""
    query = (
        db.query(ModelComment)
        .options(joinedload(ModelComment.user))
        .filter(ModelComment.model_id == model_id, ModelComment.parent_id.is_(None))
        .order_by(ModelComment.created_at.desc())
    )
    total = query.count()
    comments = query.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for c in comments:
        item = comment_to_response(c)
        replies = (
            db.query(ModelComment)
            .options(joinedload(ModelComment.user))
            .filter(ModelComment.parent_id == c.id)
            .order_by(ModelComment.created_at.asc())
            .all()
        )
        item["replies"] = [comment_to_response(r) for r in replies]
        result.append(item)

    return {"total": total, "items": result, "page": page, "page_size": page_size}


@router.post("/model/{model_id}")
def create_model_comment(
    model_id: int,
    data: dict = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """用户对模型发表评论"""
    comment = ModelComment(
        model_id=model_id,
        user_id=user.id,
        content=data.get('content', ''),
    )
    db.add(comment)
    db.flush()

    from app.api.notifications import create_activity_and_commit
    from app.models.notification import ActivityType
    create_activity_and_commit(
        db=db,
        user_id=user.id,
        type=ActivityType.NEW_COMMENT,
        title=f"评论了模型 #{model_id}",
        content_preview=data.get('content', '')[:150],
        model_id=model_id,
    )

    db.refresh(comment)
    return comment_to_response(comment)


@router.post("/model/{model_id}/reply/{parent_id}")
def reply_to_comment(
    model_id: int,
    parent_id: int,
    data: dict = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """回复某个评论"""
    parent = db.query(ModelComment).filter(ModelComment.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="评论不存在")

    reply = ModelComment(
        model_id=model_id,
        user_id=user.id,
        content=data.get('content', ''),
        parent_id=parent_id,
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return comment_to_response(reply)


@router.get("")
def list_all_comments(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """管理员获取所有评论列表（包含模型名称）"""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可查看")

    # 先计数（不要用 joinedload，会搞乱 COUNT）
    base_q = db.query(ModelComment)
    if search:
        like = f"%{search}%"
        base_q = base_q.filter(ModelComment.content.ilike(like))
    total = base_q.count()

    # 查数据（用 joinedload 加载 author）
    q = (
        db.query(ModelComment)
        .options(joinedload(ModelComment.user))
    )
    if search:
        q = q.filter(ModelComment.content.ilike(f"%{search}%"))
    q = q.order_by(ModelComment.created_at.desc())
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for c in items:
        item = comment_to_response(c)
        from app.models.model import Model3D
        model = db.query(Model3D).filter(Model3D.id == c.model_id).first()
        item["model_name"] = model.name if model else None
        result.append(item)

    return {"total": total, "items": result}


@router.delete("/{comment_id}")
def delete_model_comment(
    comment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除评论（管理员或评论作者）"""
    c = db.query(ModelComment).filter(ModelComment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="评论不存在")
    if user.role != UserRole.ADMIN and c.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权限删除")
    db.delete(c)
    db.commit()
    return {"message": "删除成功"}
