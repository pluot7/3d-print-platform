"""帮助中心API"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.help import HelpArticle
from app.schemas.help import (
    HelpArticleResponse,
    HelpArticleCreate,
    HelpArticleUpdate,
)
from app.api.deps import get_admin_user

router = APIRouter(prefix="/api/help", tags=["帮助中心"])


def _to_response(a: HelpArticle) -> HelpArticleResponse:
    return HelpArticleResponse(
        id=a.id,
        section=a.section,
        title=a.title,
        content=a.content,
        sort_order=a.sort_order,
    )


@router.get("/{section}", response_model=List[HelpArticleResponse])
def get_help_section(section: str, db: Session = Depends(get_db)):
    """获取帮助中心某个分区的文章列表（公开）"""
    items = (
        db.query(HelpArticle)
        .filter(
            HelpArticle.section == section,
            HelpArticle.is_active == True,
        )
        .order_by(HelpArticle.sort_order)
        .all()
    )
    return [_to_response(a) for a in items]


@router.get("/all/list", response_model=List[HelpArticleResponse])
def get_all_help_articles(
    _=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """获取所有帮助文章（管理员）"""
    items = db.query(HelpArticle).order_by(HelpArticle.section, HelpArticle.sort_order).all()
    return [_to_response(a) for a in items]


@router.post("", response_model=HelpArticleResponse)
def create_help_article(
    data: HelpArticleCreate,
    _=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """创建帮助文章（管理员）"""
    a = HelpArticle(
        section=data.section,
        title=data.title,
        content=data.content,
        sort_order=data.sort_order,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _to_response(a)


@router.put("/{article_id}", response_model=HelpArticleResponse)
def update_help_article(
    article_id: int,
    data: HelpArticleUpdate,
    _=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """更新帮助文章（管理员）"""
    a = db.query(HelpArticle).filter(HelpArticle.id == article_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="文章不存在")
    update_data = data.model_dump(exclude_none=True)
    for key, val in update_data.items():
        setattr(a, key, val)
    db.commit()
    db.refresh(a)
    return _to_response(a)


@router.delete("/{article_id}")
def delete_help_article(
    article_id: int,
    _=Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """删除帮助文章（管理员）"""
    a = db.query(HelpArticle).filter(HelpArticle.id == article_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="文章不存在")
    db.delete(a)
    db.commit()
    return {"ok": True}
