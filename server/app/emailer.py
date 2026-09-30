"""邮箱验证码 — 生成 / 频控 / 校验 / SMTP 发送

频控（进程内存实现，多实例部署时换 Redis）：
- 同一邮箱 60 秒 1 封
- 同一邮箱每天 5 封
- 同一 IP 每小时 10 封
"""
import hashlib
import random
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from email.header import Header
from email.mime.text import MIMEText
from email.utils import formataddr

import aiosmtplib

from .config import settings
from .database import get_db_session
from .models import VerificationCode

CODE_TTL_SECONDS = 600
MAX_ATTEMPTS = 5

_last_send: dict[str, float] = {}
_daily_window: dict[str, deque[float]] = defaultdict(deque)
_ip_window: dict[str, deque[float]] = defaultdict(deque)


class RateLimited(Exception):
    def __init__(self, msg: str, retry_after: int = 60):
        super().__init__(msg)
        self.retry_after = retry_after


def check_rate_limit(email: str, ip: str) -> None:
    now = time.monotonic()
    last = _last_send.get(email)
    if last is not None and now - last < 60:
        raise RateLimited("发送太频繁，请 1 分钟后再试", int(60 - (now - last)) + 1)

    day = _daily_window[email]
    while day and now - day[0] > 86400:
        day.popleft()
    if len(day) >= 5:
        raise RateLimited("该邮箱今日发送次数已达上限，请明天再试", 3600)

    ipw = _ip_window[ip]
    while ipw and now - ipw[0] > 3600:
        ipw.popleft()
    if len(ipw) >= 10:
        raise RateLimited("当前网络发送次数已达上限，请稍后再试", 1800)


def record_send(email: str, ip: str) -> None:
    now = time.monotonic()
    _last_send[email] = now
    _daily_window[email].append(now)
    _ip_window[ip].append(now)


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def code_hash(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def save_code(email: str, code: str, purpose: str) -> None:
    with get_db_session() as db:
        db.add(
            VerificationCode(
                target=email.lower(),
                code_hash=code_hash(code),
                purpose=purpose,
                expires_at=datetime.utcnow() + timedelta(seconds=CODE_TTL_SECONDS),
            )
        )
        db.commit()


def verify_code(email: str, code: str, purpose: str) -> None:
    """校验通过立即消费；失败累计 attempts，超限作废"""
    email = email.lower()
    with get_db_session() as db:
        now = datetime.utcnow()
        row = (
            db.query(VerificationCode)
            .filter(
                VerificationCode.target == email,
                VerificationCode.purpose == purpose,
                VerificationCode.consumed_at.is_(None),
                VerificationCode.expires_at > now,
            )
            .order_by(VerificationCode.id.desc())
            .first()
        )
        if row is None:
            raise ValueError("验证码已过期，请重新获取")
        if row.attempts >= MAX_ATTEMPTS:
            raise ValueError("验证码错误次数过多，请重新获取")
        row.attempts += 1
        if row.code_hash != code_hash(code.strip()):
            db.commit()
            raise ValueError("验证码不正确")
        row.consumed_at = now
        db.commit()


def _build_message(to: str, code: str, scene: str) -> MIMEText:
    html = f"""
    <div style="max-width:480px;margin:0 auto;font-family:sans-serif;color:#1c1b1f">
      <h2 style="color:#1c1b1f">{settings.mail_sender_name}</h2>
      <p>你正在进行 <b>{scene}</b> 操作，验证码为：</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#6750a4">{code}</p>
      <p style="color:#5f5e5a">10 分钟内有效，请勿泄露给他人。如非本人操作，请忽略本邮件。</p>
    </div>
    """
    msg = MIMEText(html, "html", "utf-8")
    msg["Subject"] = Header(f"{settings.mail_sender_name} · {scene}验证码", "utf-8")
    msg["From"] = formataddr((str(Header(settings.mail_sender_name, "utf-8")), settings.smtp_from or settings.smtp_user))
    msg["To"] = to
    return msg


async def send_code_email(to: str, code: str, scene: str) -> None:
    if not settings.smtp_host:
        if settings.is_dev:
            print(f"[dev] 验证码 -> {to} : {code} ({scene})")
            return
        raise RuntimeError("SMTP 未配置")
    await aiosmtplib.send(
        _build_message(to, code, scene),
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        use_tls=settings.smtp_tls,
    )


def normalize_email(v: str) -> str:
    return re.sub(r"\s", "", v).lower()
