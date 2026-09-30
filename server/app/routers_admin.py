"""管理后台路由 — 仅 admin 角色可访问"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .database import get_db
from .models import Account, Budget, Category, RefreshToken, Transaction, User
from .schemas import (
    AdminResetPasswordIn,
    AdminRolePatchIn,
    AdminStatusPatchIn,
    AdminUserOut,
)
from .security import get_current_admin, hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_user_out(db: Session, u: User) -> dict:
    txn_count = db.query(func.count(Transaction.id)).filter(Transaction.user_id == u.id).scalar()
    out = AdminUserOut.model_validate(u, from_attributes=True)
    data = out.model_dump(by_alias=True)
    data["transaction_count"] = int(txn_count or 0)
    data["created_at"] = u.created_at.isoformat()
    return data


@router.get("/users")
def list_users(
    q: str | None = Query(None, description="按用户名/昵称/邮箱/手机号模糊搜索"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            (User.username.like(like))
            | (User.display_name.like(like))
            | (User.email.like(like))
            | (User.phone.like(like))
        )
    total = query.count()
    rows = (
        query.order_by(User.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"items": [_admin_user_out(db, u) for u in rows], "total": total, "page": page, "page_size": page_size}


def _target_user(db: Session, uid: str) -> User:
    try:
        uid_int = int(uid)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "用户不存在")
    u = db.get(User, uid_int)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "用户不存在")
    return u


@router.patch("/users/{uid}/role")
def set_role(uid: str, body: AdminRolePatchIn, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    target = _target_user(db, uid)
    if target.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "不能修改自己的角色")
    target.role = body.role
    if body.role != "admin":
        # 收回管理员权限后吊销其全部刷新令牌
        db.query(RefreshToken).filter(RefreshToken.user_id == target.id).update({"revoked": True})
    db.commit()
    return _admin_user_out(db, target)


@router.patch("/users/{uid}/status")
def set_status(
    uid: str, body: AdminStatusPatchIn, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)
):
    target = _target_user(db, uid)
    if target.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "不能禁用自己的账号")
    target.disabled = body.disabled
    if body.disabled:
        db.query(RefreshToken).filter(RefreshToken.user_id == target.id).update({"revoked": True})
    db.commit()
    return _admin_user_out(db, target)


@router.put("/users/{uid}/password")
def reset_password(
    uid: str, body: AdminResetPasswordIn, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)
):
    target = _target_user(db, uid)
    target.password_hash = hash_password(body.new_password)
    db.query(RefreshToken).filter(RefreshToken.user_id == target.id).update({"revoked": True})
    db.commit()
    return {"ok": True}


@router.delete("/users/{uid}")
def delete_user(uid: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    target = _target_user(db, uid)
    if target.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "不能删除自己的账号")
    if target.role == "admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "不能删除管理员账号，请先收回其管理员权限")
    # 手动按依赖顺序清理（transactions 无 ORM 级联）
    user_txns = db.query(Transaction.id).filter(Transaction.user_id == target.id).subquery()
    db.query(Transaction).filter(Transaction.user_id == target.id).delete(synchronize_session=False)
    db.query(Budget).filter(Budget.user_id == target.id).delete(synchronize_session=False)
    db.query(Account).filter(Account.user_id == target.id).delete(synchronize_session=False)
    db.query(Category).filter(Category.user_id == target.id).delete(synchronize_session=False)
    db.query(RefreshToken).filter(RefreshToken.user_id == target.id).delete(synchronize_session=False)
    db.delete(target)
    db.commit()
    return {"ok": True}


@router.get("/stats")
def admin_stats(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    d7, d30 = now - timedelta(days=7), now - timedelta(days=30)
    return {
        "user_count": db.query(func.count(User.id)).scalar(),
        "disabled_count": db.query(func.count(User.id)).filter(User.disabled.is_(True)).scalar(),
        "admin_count": db.query(func.count(User.id)).filter(User.role == "admin").scalar(),
        "transaction_count": db.query(func.count(Transaction.id)).scalar(),
        "new_users_7d": db.query(func.count(User.id)).filter(User.created_at >= d7).scalar(),
        "new_users_30d": db.query(func.count(User.id)).filter(User.created_at >= d30).scalar(),
    }
