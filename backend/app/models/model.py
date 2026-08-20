from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Enum, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ModelStatus(str, enum.Enum):
    PENDING = "pending"       # 待审核
    APPROVED = "approved"     # 已通过
    REJECTED = "rejected"     # 已拒绝


class ModelCategory(str, enum.Enum):
    FIGURE = "figure"         # 手办人物
    MECHANICAL = "mechanical"  # 机械零件
    ARCHITECTURAL = "architectural"  # 建筑模型
    ART = "art"               # 艺术摆件
    OTHER = "other"           # 其他


class Model3D(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(ModelCategory), default=ModelCategory.OTHER)
    status = Column(Enum(ModelStatus), default=ModelStatus.PENDING)

    # 文件信息
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    file_type = Column(String(20), nullable=False)  # .stl .obj 等
    glb_path = Column(String(500), nullable=True)  # 转换后的 glb 文件路径
    preview_images = Column(String(500), nullable=True)  # JSON array of paths

    # 打印参数
    dimensions_x = Column(Float, nullable=True)  # mm
    dimensions_y = Column(Float, nullable=True)
    dimensions_z = Column(Float, nullable=True)
    material = Column(String(50), default="pla")  # PLA/ABS/树脂等
    layer_height = Column(Float, nullable=True)  # mm
    infill = Column(Integer, nullable=True)  # %

    # 计算属性
    volume = Column(Float, nullable=True)  # cm³
    weight = Column(Float, nullable=True)  # g

    # 价格与库存
    base_price = Column(Float, default=0)
    is_official = Column(Boolean, default=False)  # 是否官方模型
    is_published = Column(Boolean, default=False)

    # 关联
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # 统计
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Model3D {self.name}>"
