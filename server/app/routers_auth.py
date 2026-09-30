"""认证路由 — 验证码注册 / 登录 / 刷新 / 找回密码 / 改密"""
import hashlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import emailer
from .config import settings
from .database import get_db
from .models import RefreshToken, User
from .schemas import (
    ChangePasswordIn,
    LoginIn,
    LogoutIn,
    RefreshIn,
    RegisterCodeIn,
    RegisterIn,
    ResetCodeIn,
    ResetPasswordIn,
    SessionUserOut,
    TokenPairOut,
    VerifyPasswordIn,
)
from .security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from .seed import seed_for_user

router = APIRouter(prefix="/auth", tags=["auth"])


def issue_tokens(db: Session, user: User) -> TokenPairOut:
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hashlib.sha256(refresh.encode()).hexdigest(),
            expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_days),
        )
    )
    db.commit()
    return TokenPairOut(
        access_token=access,
        refresh_token=refresh,
        user=SessionUserOut.model_validate(user),
    )


@router.post("/register/code")
async def send_register_code(body: RegisterCodeIn, request: Request, db: Session = Depends(get_db)):
    email = emailer.normalize_email(body.email)
    exists = db.query(User).filter(User.email == email).first()
    if exists:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "该邮箱已被注册")

    ip = request.client.host if request.client else "unknown"
    try:
        emailer.check_rate_limit(email, ip)
    except emailer.RateLimited as e:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, str(e), {"Retry-After": str(e.retry_after)})

    code = emailer.generate_code()
    emailer.record_send(email, ip)
    emailer.save_code(email, code, "register")
    await emailer.send_code_email(email, code, "注册")

    resp: dict = {"sent": True}
    if settings.is_dev:
        resp["dev_code"] = code  # 仅供开发调试，生产不返回
    return resp


@router.post("/register", response_model=TokenPairOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = emailer.normalize_email(str(body.email))
    # 先做可预检的冲突校验（不烧掉验证码），再验码
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "该用户名已被注册")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "该邮箱已被注册")
    if body.phone and db.query(User).filter(User.phone == body.phone).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "该手机号已被绑定")
    try:
        emailer.verify_code(email, body.code, "register")
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=(body.display_name or "").strip() or body.username,
        email=email,
        phone=body.phone,
        prefs={},
    )
    # 全库首个注册用户自动成为管理员
    if db.query(func.count(User.id)).scalar() == 0:
        user.role = "admin"
    db.add(user)
    db.commit()
    db.refresh(user)
    seed_for_user(db, user.id)
    return issue_tokens(db, user)


@router.post("/login", response_model=TokenPairOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username.strip().lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "用户名或密码不正确")
    if user.disabled:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "账号已被禁用，请联系管理员")
    return issue_tokens(db, user)


@router.post("/refresh", response_model=TokenPairOut)
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    user_id = decode_token(body.refresh_token, "refresh")
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    row = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash, RefreshToken.revoked.is_(False))
        .first()
    )
    if row is None or row.expires_at < datetime.utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "会话已失效，请重新登录")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "账号不存在")

    # 轮换：旧 refresh 作废，签发新的
    row.revoked = True
    db.commit()
    return issue_tokens(db, user)


@router.post("/logout")
def logout(body: LogoutIn, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if row:
        row.revoked = True
        db.commit()
    return {"ok": True}


@router.post("/verify-password")
def verify_password_endpoint(body: VerifyPasswordIn, user: User = Depends(get_current_user)):
    return {"valid": verify_password(body.password, user.password_hash)}


@router.put("/password")
def change_password(body: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "原密码不正确")
    user.password_hash = hash_password(body.new_password)
    # 改密后吊销所有刷新令牌，要求重新登录
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update({"revoked": True})
    db.commit()
    return {"ok": True}


@router.post("/password/reset-code")
async def send_reset_code(body: ResetCodeIn, request: Request, db: Session = Depends(get_db)):
    """找回密码：验证 username + 邮箱匹配后发送验证码"""
    user = db.query(User).filter(User.username == body.username.strip().lower()).first()
    if user is None or not user.email or user.email != emailer.normalize_email(str(body.email)):
        # 不区分"用户名不存在 / 邮箱不匹配"，避免枚举探测
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "用户名与绑定邮箱不匹配")

    email = user.email
    ip = request.client.host if request.client else "unknown"
    try:
        emailer.check_rate_limit(email, ip)
    except emailer.RateLimited as e:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, str(e), {"Retry-After": str(e.retry_after)})

    code = emailer.generate_code()
    emailer.record_send(email, ip)
    emailer.save_code(email, code, "reset_password")
    await emailer.send_code_email(email, code, "找回密码")

    resp: dict = {"sent": True}
    if settings.is_dev:
        resp["dev_code"] = code
    return resp


@router.post("/password/reset")
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)):
    email = emailer.normalize_email(str(body.email))
    try:
        emailer.verify_code(email, body.code, "reset_password")
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "账号不存在")
    user.password_hash = hash_password(body.new_password)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update({"revoked": True})
    db.commit()
    return {"ok": True}
