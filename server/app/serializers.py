"""ORM → 前端响应结构 的手工映射（字段名与 src/data/types.ts 对齐）"""
from sqlalchemy.orm import Session

from .models import Account, Budget, Category, Transaction


def category_out(c: Category) -> dict:
    return {"id": str(c.id), "name": c.name, "icon": c.icon, "color": c.color, "type": c.type}


def account_out(db: Session, a: Account) -> dict:
    from sqlalchemy import func, case

    net = (
        db.query(
            func.coalesce(
                func.sum(case((Transaction.type == "income", Transaction.amount), else_=-Transaction.amount)),
                0,
            )
        )
        .filter(Transaction.account_id == a.id)
        .scalar()
    )
    return {
        "id": str(a.id),
        "name": a.name,
        "type": a.type,
        "balance": round(float(a.initial_balance) + float(net or 0), 2),
        "icon": a.icon,
        "note": a.note,
    }


def transaction_out(t: Transaction) -> dict:
    return {
        "id": str(t.id),
        "type": t.type,
        "amount": round(float(t.amount), 2),
        "category": str(t.category_id),
        "account": str(t.account_id),
        "description": t.description,
        "date": t.date.isoformat(),
        "tags": t.tags or [],
        "note": t.note,
    }


def budget_out(b: Budget) -> dict:
    return {"id": str(b.id), "category": str(b.category_id), "amount": round(float(b.amount), 2), "period": b.period}
