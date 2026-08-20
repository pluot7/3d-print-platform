# 导入所有模型，让 Base.metadata.create_all() 能发现它们
from app.models.user import User, UserRole
from app.models.model import Model3D, ModelStatus, ModelCategory
from app.models.order import Order, OrderStatus, PaymentMethod
from app.models.address import Address
from app.models.discussion import Discussion, DiscussionCategory, DiscussionReply, ModelComment

__all__ = [
    "User",
    "UserRole",
    "Model3D",
    "ModelStatus",
    "ModelCategory",
    "Order",
    "OrderStatus",
    "PaymentMethod",
    "Address",
    "Discussion",
    "DiscussionCategory",
    "DiscussionReply",
    "ModelComment",
]
