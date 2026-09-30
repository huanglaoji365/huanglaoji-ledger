"""应用配置 — 全部来自环境变量 / .env 文件"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "dev"
    database_url: str = "sqlite:///./hlj.db"

    jwt_secret: str = "dev-only-secret-change-me"
    access_token_minutes: int = 30
    refresh_token_days: int = 14

    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_tls: bool = True
    mail_sender_name: str = "黄老吉记账"

    # 启动时把该用户名提升为管理员（用于给已有用户提权；新库首个注册用户自动成为管理员）
    admin_username: str = ""

    @property
    def is_dev(self) -> bool:
        return self.env == "dev"


settings = Settings()
