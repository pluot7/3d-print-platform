"""
举报管理 API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/reports", tags=["举报"])

reportReasons = [
    "垃圾内容", "色情低俗", "人身攻击",
    "广告营销", "侵权投诉", "其他原因"
]


@router.post("", response_model=ReportResponse)
def create_report(
    data: ReportCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """用户举报内容"""
    existing = db.query(Report).filter(
        Report.reporter_id == user.id,
        Report.target_type == data.target_type,
        Report.target_id == data.target_id,
        Report.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="你已经举报过这个内容了，请等待管理员处理")

    report = Report(
        reporter_id=user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        description=data.description,
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return ReportResponse.model_validate(report)


@router.get("")
def list_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """管理员获取举报列表"""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可查看")

    q = db.query(Report)
    if status_filter:
        q = q.filter(Report.status == status_filter)
    reports = q.order_by(Report.created_at.desc()).all()

    result = []
    for r in reports:
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        result.append({
            "id": r.id,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "reason": r.reason,
            "description": r.description,
            "status": r.status,
            "reporter_name": reporter.username if reporter else "匿名",
            "created_at": str(r.created_at) if r.created_at else None,
        })
    return result


@router.put("/{report_id}/handle")
def handle_report(
    report_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """管理员标记举报已处理"""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可操作")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="举报不存在")

    report.status = "resolved"
    db.commit()
    return {"message": "举报已标记为已处理"}
