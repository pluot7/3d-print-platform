"""材料价格模型"""
from sqlalchemy import Column, Integer, String, Float, Text, Boolean
from app.core.database import Base

class Material(Base):
    """3D打印材料"""
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name_zh = Column(String(50), nullable=False, comment="材料中文名")
    name_en = Column(String(50), nullable=False, comment="材料英文ID")
    price_per_gram = Column(Float, nullable=False, comment="每克单价(元)")
    density = Column(Float, nullable=False, comment="密度(g/cm3)")
    description = Column(Text, comment="说明")
    pros = Column(Text, comment="优点(JSON数组)")
    cons = Column(Text, comment="缺点(JSON数组)")
    icon = Column(String(10), comment="图标emoji")
    is_active = Column(Boolean, default=True, comment="是否启用")
    sort_order = Column(Integer, default=0, comment="排序")
