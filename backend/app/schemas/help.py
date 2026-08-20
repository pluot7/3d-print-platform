"""帮助中心Schema"""
from typing import List, Optional
from pydantic import BaseModel


class HelpArticleResponse(BaseModel):
    id: int
    section: str
    title: str
    content: Optional[str] = None
    sort_order: int

    class Config:
        from_attributes = True


class HelpSectionResponse(BaseModel):
    section: str
    items: List[HelpArticleResponse]


class HelpArticleCreate(BaseModel):
    section: str
    title: str
    content: Optional[str] = None
    sort_order: int = 0


class HelpArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    section: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
