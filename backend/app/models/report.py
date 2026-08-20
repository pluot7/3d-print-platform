from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ReportTargetType(str, enum.Enum):
    MODEL = "model"             # 模型
    DISCUSSION = "discussion"   # 帖子
    REPLY = "reply"             # 回帖
    COMMENT = "comment"         # 模型评论


class ReportStatus(str, enum.Enum):
    PENDING = "pending"         # 待处理
    DISMISSED = "dismissed"     # 已驳回
    ACTIONED = "actioned"       # 已处理


class Report(Base):
    """举报记录"""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    target_type = Column(Enum(ReportTargetType), nullable=False)   # 举报类型
    target_id = Column(Integer, nullable=False)                     # 被举报对象 ID
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 举报人
    reason = Column(String(20), nullable=False)                     # 举报原因（简短标签）
    detail = Column(Text, nullable=True)                            # 补充说明

    status = Column(Enum(ReportStatus), default=ReportStatus.PENDING)
    handled_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 处理人
    handled_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    reporter = relationship("User", primaryjoin="Report.reporter_id == User.id", foreign_keys=[reporter_id], lazy="joined")
    handler = relationship("User", primaryjoin="Report.handled_by == User.id", foreign_keys=[handled_by], lazy="joined")

    def __repr__(self):
        return f"<Report #{self.id} {self.target_type.value}#{self.target_id} by {self.reporter_id}>"
