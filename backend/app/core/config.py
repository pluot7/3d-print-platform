from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # 应用基本信息
    APP_NAME: str = "打个东西 - 3D打印智造中心"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # 数据库 - 优先使用 MySQL
    # USE_MYSQL=True  → MySQL（本地/服务器）
    # USE_MYSQL=False → SQLite（临时调试）
    USE_MYSQL: bool = True

    # MySQL 配置（USE_MYSQL=True 时使用）
    # 生产环境请通过环境变量或 .env 文件覆盖以下默认值
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""  # 必填：从环境变量 MYSQL_PASSWORD 读取
    MYSQL_DATABASE: str = "3dprint"

    # SQLite 配置（USE_MYSQL=False 时使用）
    SQLITE_PATH: str = "sqlite:///./3dprint.db"

    # JWT 密钥（必填：通过环境变量 SECRET_KEY 注入，生产环境使用强随机字符串）
    SECRET_KEY: str = ""  # 必填：从环境变量 SECRET_KEY 读取
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7天

    # 文件上传
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_EXTENSIONS: set = {".3mf"}

    # BambuStudio 切片引擎路径
    BAMBU_STUDIO_PATH: str = r"E:\tuoz\Bambu_Studio_win-v02.06.00.51-20260417160415\bambu-studio.exe"
    # 切片超时（秒）
    SLICE_TIMEOUT: int = 120
    # 切片默认参数
    SLICE_INFILL: int = 15
    SLICE_LAYER_HEIGHT: float = 0.20

    # CORS（前端地址）
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
