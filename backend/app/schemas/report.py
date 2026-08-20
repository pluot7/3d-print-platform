from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.report import ReportTargetType, ReportStatus


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: int
    reason: str = Field(..., max_length=20)
    detail: Optional[str] = Field(None, max_length=500)


class ReportResponse(BaseModel):
    id: int
    target_type: ReportTargetType
    target_id: int
    reporter_id: int
    reporter_name: Optional[str] = None
    reason: str
    detail: Optional[str] = None
    status: ReportStatus
    handled_by: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    total: int
    items: List[ReportResponse]
