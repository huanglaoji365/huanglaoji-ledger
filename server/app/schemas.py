"""Pydantic 模型 — 响应字段名与前端 src/data/types.ts 完全对齐（id 序列化为字符串）"""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

TxnType = Literal["income", "expense"]
AccountType = Literal["cash", "bank", "mobile-pay", "credit"]


def _ser(v: object) -> str:
    return v if isinstance(v, str) else str(v)


class ApiModel(BaseModel):
    """数字 id 统一转字符串，前端类型里 id 均为 string"""
    model_config = ConfigDict(from_attributes=True, coerce_numbers_to_str=True, serialize_as_any=True)


# ---------------- 用户 / 会话 ----------------

class SessionUserOut(ApiModel):
    username: str
    display_name: str = Field(serialization_alias="displayName")
    avatar: str | None = None
    email: str | None = None
    phone: str | None = None
    role: str = "user"


class TokenPairOut(BaseModel):
    access_token: str
    refresh_token: str
    user: SessionUserOut


class RegisterCodeIn(BaseModel):
    email: EmailStr


class RegisterIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=8)
    username: str = Field(min_length=2, max_length=20)
    password: str = Field(min_length=6, max_length=40)
    display_name: str | None = Field(None, max_length=30)
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        import re
        if not re.fullmatch(r"1[3-9]\d{9}", v.strip()):
            raise ValueError("手机号格式不正确")
        return v.strip()

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        import re
        v = v.strip().lower()
        if not re.fullmatch(r"[a-z0-9_\u4e00-\u9fa5]{2,20}", v):
            raise ValueError("用户名需为 2–20 位字母、数字、下划线或中文")
        return v


class LoginIn(BaseModel):
    username: str
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str


class VerifyPasswordIn(BaseModel):
    password: str


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=40)


class ResetCodeIn(BaseModel):
    username: str
    email: EmailStr


class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=8)
    new_password: str = Field(min_length=6, max_length=40)


class ProfilePatchIn(BaseModel):
    display_name: str | None = Field(None, max_length=30)
    avatar: str | None = None
    email: EmailStr | None = None
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        import re
        if not re.fullmatch(r"1[3-9]\d{9}", v.strip()):
            raise ValueError("手机号格式不正确")
        return v.strip()

    @field_validator("avatar")
    @classmethod
    def avatar_size(cls, v: str | None) -> str | None:
        if v and len(v) > 300_000:  # data URL 上限约 300KB
            raise ValueError("头像过大，请换一张小图")
        return v


class PrefsIn(BaseModel):
    theme: str | None = None
    hue: int | None = Field(None, ge=0, le=360)


class PrefsOut(PrefsIn):
    pass


# ---------------- 业务实体 ----------------

class CategoryOut(ApiModel):
    id: str
    name: str
    icon: str
    color: int
    type: TxnType

    @field_validator("id", mode="before")
    @classmethod
    def _id(cls, v: object) -> str:
        return _ser(v)


class AccountOut(ApiModel):
    id: str
    name: str
    type: AccountType
    balance: float
    icon: str
    note: str | None = None


class AccountCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    type: AccountType
    icon: str = "bank"
    note: str | None = Field(None, max_length=100)
    balance: float = 0  # 初始余额


class AccountUpdateIn(BaseModel):
    name: str | None = Field(None, max_length=50)
    type: AccountType | None = None
    icon: str | None = None
    note: str | None = Field(None, max_length=100)
    balance: float | None = None  # 修改余额 = 调整期初，流水不动


class TransactionOut(ApiModel):
    id: str
    type: TxnType
    amount: float
    category: str  # category_id
    account: str  # account_id
    description: str
    date: date
    tags: list[str] = []
    note: str | None = None


class TransactionIn(BaseModel):
    type: TxnType
    amount: float = Field(gt=0, le=99_999_999)
    category: str
    account: str
    description: str = Field(default="", max_length=100)
    date: date
    tags: list[str] = Field(default_factory=list, max_length=10)
    note: str | None = Field(None, max_length=200)

    @field_validator("tags")
    @classmethod
    def tags_clean(cls, v: list[str]) -> list[str]:
        return [t.strip() for t in v if t.strip()][:10]


class TransactionUpdateIn(TransactionIn):
    pass


class BudgetOut(ApiModel):
    id: str
    category: str  # category_id
    amount: float
    period: Literal["monthly"] = "monthly"


class BudgetIn(BaseModel):
    category: str
    amount: float = Field(gt=0, le=99_999_999)
    period: Literal["monthly"] = "monthly"


# ---------------- 管理后台 ----------------

AdminRole = Literal["user", "admin"]


class AdminUserOut(ApiModel):
    id: str
    username: str
    display_name: str = Field(serialization_alias="displayName")
    email: str | None = None
    phone: str | None = None
    role: AdminRole = "user"
    disabled: bool = False
    created_at: datetime
    transaction_count: int = 0

    @field_validator("id", mode="before")
    @classmethod
    def _id(cls, v: object) -> str:
        return _ser(v)


class AdminRolePatchIn(BaseModel):
    role: AdminRole


class AdminStatusPatchIn(BaseModel):
    disabled: bool


class AdminResetPasswordIn(BaseModel):
    new_password: str = Field(min_length=6, max_length=40)
