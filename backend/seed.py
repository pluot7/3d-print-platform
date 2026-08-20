# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

"""
初始化数据脚本
运行一次即可，创建演示账号和一些示例数据

启动后端后，在浏览器打开：
  http://127.0.0.1:8000/docs
  查看 API 文档并测试

运行方式（从 backend 目录）：
  python seed.py
"""
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import User, UserRole, Model3D, ModelStatus, ModelCategory, Order, OrderStatus


def init_db():
    """创建所有表"""
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表已创建")


def seed_users(db):
    """创建演示账号"""
    # 检查是否已有数据
    existing = db.query(User).first()
    if existing:
        print("ℹ️  用户数据已存在，跳过")
        return

    users = [
        User(
            username="user",
            hashed_password=get_password_hash("123456"),
            role=UserRole.USER,
            full_name="演示用户",
            email="user@example.com",
            is_active=True,
            is_verified=True,
        ),
        User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            full_name="管理员",
            email="admin@example.com",
            is_active=True,
            is_verified=True,
        ),
    ]

    for u in users:
        db.add(u)
    db.commit()
    print("✅ 演示账号已创建：")
    print("   user  / 123456   (普通用户)")
    print("   admin / admin123 (管理员)")


def seed_models(db):
    """创建示例3D模型"""
    existing = db.query(Model3D).first()
    if existing:
        print("ℹ️  模型数据已存在，跳过")
        return

    models = [
        Model3D(
            name="经典方块",
            description="最基础的测试模型，立方体形状，适合新手打印练习",
            category=ModelCategory.OTHER,
            material="PLA",
            layer_height=0.2,
            infill=20,
            base_price=5.0,
            file_path="demo/block.stl",
            file_size=1024,
            file_type=".stl",
            status=ModelStatus.APPROVED,
            is_published=True,
            is_official=True,
            uploader_id=2,
            dimensions_x=20,
            dimensions_y=20,
            dimensions_z=20,
        ),
        Model3D(
            name="可爱小熊摆件",
            description="卡通风格小熊，适合桌面装饰，可爱风格爱好者首选",
            category=ModelCategory.FIGURE,
            material="树脂",
            layer_height=0.05,
            infill=15,
            base_price=35.0,
            file_path="demo/bear.stl",
            file_size=51200,
            file_type=".stl",
            status=ModelStatus.APPROVED,
            is_published=True,
            is_official=True,
            uploader_id=2,
            dimensions_x=50,
            dimensions_y=60,
            dimensions_z=45,
            rating=4.8,
        ),
        Model3D(
            name="手机支架",
            description="简约实用的手机支架模型，兼容大部分智能手机型号",
            category=ModelCategory.ART,
            material="PLA",
            layer_height=0.1,
            infill=30,
            base_price=12.0,
            file_path="demo/phone_stand.stl",
            file_size=8192,
            file_type=".stl",
            status=ModelStatus.APPROVED,
            is_published=True,
            is_official=False,
            uploader_id=1,
            dimensions_x=70,
            dimensions_y=40,
            dimensions_z=10,
            rating=4.5,
        ),
        Model3D(
            name="齿轮组件套装",
            description="标准齿轮组，含大中小三种规格，适合机械结构教学",
            category=ModelCategory.MECHANICAL,
            material="ABS",
            layer_height=0.1,
            infill=40,
            base_price=25.0,
            file_path="demo/gear_set.stl",
            file_size=15360,
            file_type=".stl",
            status=ModelStatus.APPROVED,
            is_published=True,
            is_official=True,
            uploader_id=2,
            dimensions_x=100,
            dimensions_y=80,
            dimensions_z=30,
            rating=4.6,
        ),
    ]

    for m in models:
        db.add(m)
    db.commit()
    print("✅ 示例模型已创建（4个）")


def seed_orders(db):
    """创建示例订单"""
    existing = db.query(Order).first()
    if existing:
        print("ℹ️  订单数据已存在，跳过")
        return

    order = Order(
        order_no="3DP2026051900001ABCD",
        user_id=1,
        model_id=1,
        status=OrderStatus.PENDING,
        print_config={
            "material": "PLA",
            "color": "白色",
            "layer_height": 0.2,
            "infill": 20,
            "quantity": 1,
        },
        model_price=10.0,
        material_fee=5.0,
        shipping_fee=15.0,
        total_price=30.0,
        recipient_name="张三",
        recipient_phone="13800138000",
        shipping_address="北京市朝阳区xxx街道xxx号",
    )
    db.add(order)
    db.commit()
    print("✅ 示例订单已创建")


def main():
    print("=" * 40)
    print("开始初始化数据库...")
    print("=" * 40)

    db = SessionLocal()
    try:
        init_db()
        seed_users(db)
        seed_models(db)
        seed_orders(db)
        print("")
        print("🎉 初始化完成！")
        print("")
        print("📌 启动后端：uvicorn app.main:app --reload")
        print("📌 API文档：http://127.0.0.1:8000/docs")
    finally:
        db.close()


if __name__ == "__main__":
    main()
