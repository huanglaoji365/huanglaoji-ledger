"""账本业务路由 — 分类 / 账户 / 交易 / 预算 CRUD"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from .database import get_db
from .models import Account, Budget, Category, Transaction, User
from .schemas import (
    AccountCreateIn,
    AccountUpdateIn,
    BudgetIn,
    CategoryOut,
    TransactionIn,
    TransactionUpdateIn,
)
from .security import get_current_user
from .serializers import account_out, budget_out, category_out, transaction_out

router = APIRouter(tags=["ledger"])


def _own_category(db: Session, user: User, cid: str) -> Category:
    try:
        cid_int = int(cid)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "分类不存在")
    c = db.query(Category).filter(Category.id == cid_int, Category.user_id == user.id).first()
    if c is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "分类不存在")
    return c


def _own_account(db: Session, user: User, aid: str) -> Account:
    try:
        aid_int = int(aid)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "账户不存在")
    a = db.query(Account).filter(Account.id == aid_int, Account.user_id == user.id).first()
    if a is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "账户不存在")
    return a


# ---------------- 分类 ----------------

@router.get("/categories")
def list_categories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Category)
        .filter(Category.user_id == user.id)
        .order_by(Category.sort_order, Category.id)
        .all()
    )
    return [category_out(c) for c in rows]


@router.post("/categories")
def create_category(body: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    name = str(body.get("name", "")).strip()
    if not name or len(name) > 30:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "分类名需为 1–30 个字符")
    if body.get("type") not in ("income", "expense"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "分类类型不正确")
    color = body.get("color", 1)
    if not isinstance(color, int) or not 1 <= color <= 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "颜色序号需为 1–8")
    c = Category(
        user_id=user.id,
        name=name,
        icon=str(body.get("icon", "help-circle")),
        color=color,
        type=body["type"],
        sort_order=99,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return category_out(c)


@router.delete("/categories/{cid}")
def delete_category(cid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _own_category(db, user, cid)
    used = db.query(Transaction).filter(Transaction.category_id == c.id).count()
    if used:
        raise HTTPException(status.HTTP_409_CONFLICT, f"该分类下有 {used} 笔交易，无法删除")
    db.query(Budget).filter(Budget.category_id == c.id).delete()
    db.delete(c)
    db.commit()
    return {"ok": True}


# ---------------- 账户 ----------------

@router.get("/accounts")
def list_accounts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Account).filter(Account.user_id == user.id).order_by(Account.id).all()
    return [account_out(db, a) for a in rows]


@router.post("/accounts")
def create_account(body: AccountCreateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = Account(
        user_id=user.id,
        name=body.name.strip(),
        type=body.type,
        icon=body.icon,
        note=body.note,
        initial_balance=body.balance,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return account_out(db, a)


@router.patch("/accounts/{aid}")
def update_account(
    aid: str, body: AccountUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    a = _own_account(db, user, aid)
    patch = body.model_dump(exclude_unset=True)
    if "balance" in patch:
        # 调整余额 = 反推期初（流水不动），保持 余额 = 期初 + Σ流水 语义
        net = (
            db.query(
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.type == "income", Transaction.amount),
                            else_=-Transaction.amount,
                        )
                    ),
                    0,
                )
            )
            .filter(Transaction.account_id == a.id)
            .scalar()
        )
        a.initial_balance = round(patch.pop("balance") - float(net or 0), 2)
    for k, v in patch.items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return account_out(db, a)


@router.delete("/accounts/{aid}")
def delete_account(aid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _own_account(db, user, aid)
    used = db.query(Transaction).filter(Transaction.account_id == a.id).count()
    if used:
        raise HTTPException(status.HTTP_409_CONFLICT, f"该账户下有 {used} 笔交易，无法删除")
    db.delete(a)
    db.commit()
    return {"ok": True}


# ---------------- 交易 ----------------

@router.get("/transactions")
def list_transactions(
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    type: str | None = Query(None, pattern="^(income|expense)$"),
    category_id: str | None = None,
    account_id: str | None = None,
    q: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction).filter(Transaction.user_id == user.id)
    if month:
        year, mon = int(month[:4]), int(month[5:7])
        start = date(year, mon, 1)
        end = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
        query = query.filter(Transaction.date >= start, Transaction.date < end)
    if type:
        query = query.filter(Transaction.type == type)
    if category_id:
        query = query.filter(Transaction.category_id == int(category_id))
    if account_id:
        query = query.filter(Transaction.account_id == int(account_id))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(Transaction.description.like(like), Transaction.note.like(like))
        )
    rows = query.order_by(Transaction.date.desc(), Transaction.id.desc()).limit(5000).all()
    return [transaction_out(t) for t in rows]


@router.post("/transactions")
def create_transaction(body: TransactionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cat = _own_category(db, user, body.category)
    acc = _own_account(db, user, body.account)
    t = Transaction(
        user_id=user.id,
        type=body.type,
        amount=body.amount,
        category_id=cat.id,
        account_id=acc.id,
        description=body.description.strip(),
        date=body.date,
        note=body.note,
        tags=body.tags,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return transaction_out(t)


@router.patch("/transactions/{tid}")
def update_transaction(
    tid: str, body: TransactionUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        tid_int = int(tid)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "交易不存在")
    t = db.query(Transaction).filter(Transaction.id == tid_int, Transaction.user_id == user.id).first()
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "交易不存在")
    cat = _own_category(db, user, body.category)
    acc = _own_account(db, user, body.account)
    t.type = body.type
    t.amount = body.amount
    t.category_id = cat.id
    t.account_id = acc.id
    t.description = body.description.strip()
    t.date = body.date
    t.note = body.note
    t.tags = body.tags
    db.commit()
    return transaction_out(t)


@router.delete("/transactions/{tid}")
def delete_transaction(tid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        tid_int = int(tid)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "交易不存在")
    t = db.query(Transaction).filter(Transaction.id == tid_int, Transaction.user_id == user.id).first()
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "交易不存在")
    db.delete(t)
    db.commit()
    return {"ok": True}


# ---------------- 预算 ----------------

@router.get("/budgets")
def list_budgets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Budget).filter(Budget.user_id == user.id).order_by(Budget.id).all()
    return [budget_out(b) for b in rows]


@router.post("/budgets")
def create_budget(body: BudgetIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cat = _own_category(db, user, body.category)
    exists = (
        db.query(Budget)
        .filter(Budget.user_id == user.id, Budget.category_id == cat.id, Budget.period == "monthly")
        .first()
    )
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "该分类已设置预算")
    b = Budget(user_id=user.id, category_id=cat.id, amount=body.amount, period="monthly")
    db.add(b)
    db.commit()
    db.refresh(b)
    return budget_out(b)


@router.patch("/budgets/{bid}")
def update_budget(
    bid: str, body: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        bid_int = int(bid)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "预算不存在")
    b = db.query(Budget).filter(Budget.id == bid_int, Budget.user_id == user.id).first()
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "预算不存在")
    if "amount" in body:
        amount = body["amount"]
        if not isinstance(amount, (int, float)) or amount <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "预算金额需为正数")
        b.amount = amount
    if "category" in body:
        b.category_id = _own_category(db, user, str(body["category"])).id
    db.commit()
    db.refresh(b)
    return budget_out(b)


@router.delete("/budgets/{bid}")
def delete_budget(bid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        bid_int = int(bid)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "预算不存在")
    b = db.query(Budget).filter(Budget.id == bid_int, Budget.user_id == user.id).first()
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "预算不存在")
    db.delete(b)
    db.commit()
    return {"ok": True}
