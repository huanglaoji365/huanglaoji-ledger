"""用户资料与偏好"""
from . import emailer
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .schemas import PrefsIn, ProfilePatchIn, SessionUserOut
from .security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=SessionUserOut)
def me(user: User = Depends(get_current_user)):
    return SessionUserOut.model_validate(user)


@router.patch("/me", response_model=SessionUserOut)
def update_profile(body: ProfilePatchIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """字段级 patch：只更新显式传入的字段；email/phone 不允许同时清空"""
    patch = body.model_dump(exclude_unset=True)

    new_email = patch.get("email")
    new_phone = patch.get("phone")
    if new_email is not None:
        new_email = emailer.normalize_email(str(new_email))
        taken = db.query(User).filter(User.email == new_email, User.id != user.id).first()
        if taken:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "该邮箱已被其他账号绑定")
        patch["email"] = new_email
    if new_phone is not None:
        taken = db.query(User).filter(User.phone == new_phone, User.id != user.id).first()
        if taken:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "该手机号已被其他账号绑定")
        patch["phone"] = new_phone

    # 至少保留一个联系方式（None 表示清空该字段）
    final_email = patch["email"] if "email" in patch else user.email
    final_phone = patch["phone"] if "phone" in patch else user.phone
    if not final_email and not final_phone:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "邮箱和手机号至少保留一项")

    for k, v in patch.items():
        setattr(user, k, v)
    if patch.get("display_name") == "":
        user.display_name = user.username
    db.commit()
    db.refresh(user)
    return SessionUserOut.model_validate(user)


@router.get("/me/prefs")
def get_prefs(user: User = Depends(get_current_user)):
    return user.prefs or {}


@router.put("/me/prefs")
def save_prefs(body: PrefsIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    merged = {**(user.prefs or {}), **body.model_dump(exclude_unset=True)}
    user.prefs = merged
    db.commit()
    return merged
