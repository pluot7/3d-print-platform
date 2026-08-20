"""
数据库初始化脚本 - 创建演示用户
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole

def init_demo_users():
    """创建演示用户"""
    db: Session = SessionLocal()
    try:
        # 检查是否已有用户
        existing = db.query(User).first()
        if existing:
            print("数据库已有用户，跳过初始化")
            return

        # 创建演示用户
        demo_users = [
            {
                "username": "user",
                "email": "user@3dprint.com",
                "password": "123456",
                "role": UserRole.USER,
            },
            {
                "username": "admin",
                "email": "admin@3dprint.com",
                "password": "admin123",
                "role": UserRole.ADMIN,
            },
        ]

        for u in demo_users:
            user = User(
                username=u["username"],
                email=u["email"],
                hashed_password=get_password_hash(u["password"]),
                role=u["role"],
                is_active=True,
            )
            db.add(user)

        db.commit()
        print("✅ 演示用户创建成功：")
        print("   - user / 123456 (普通用户)")
        print("   - admin / admin123 (管理员)")

    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    # 确保表已创建
    Base.metadata.create_all(bind=engine)
    init_demo_users()
