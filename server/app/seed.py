"""新用户初始化 — 默认分类与账户（与前端 src/data/seed.ts 的演示字典一致）"""
from sqlalchemy.orm import Session

from .models import Account, Category

DEFAULT_CATEGORIES = [
    ("餐饮美食", "utensils", 1, "expense"),
    ("交通出行", "bus", 7, "expense"),
    ("日常购物", "cart", 3, "expense"),
    ("居住水电", "house", 4, "expense"),
    ("文娱游戏", "gamepad", 5, "expense"),
    ("医疗健康", "heart", 8, "expense"),
    ("学习成长", "book", 2, "expense"),
    ("人情往来", "gift", 6, "expense"),
    ("工资收入", "briefcase", 2, "income"),
    ("理财收益", "trend-up", 7, "income"),
    ("红包礼金", "gift", 6, "income"),
    ("兼职副业", "sparkles", 4, "income"),
]

DEFAULT_ACCOUNTS = [
    ("现金", "cash", "banknote", None),
    ("银行卡", "bank", "bank", None),
    ("微信钱包", "mobile-pay", "chat", "零钱"),
    ("支付宝", "mobile-pay", "smartphone", "余额宝"),
]


def seed_for_user(db: Session, user_id: int) -> None:
    for i, (name, icon, color, tp) in enumerate(DEFAULT_CATEGORIES):
        db.add(Category(user_id=user_id, name=name, icon=icon, color=color, type=tp, sort_order=i))
    for name, tp, icon, note in DEFAULT_ACCOUNTS:
        db.add(Account(user_id=user_id, name=name, type=tp, icon=icon, note=note, initial_balance=0))
    db.commit()
