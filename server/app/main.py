"""应用入口 — uvicorn app.main:app --reload"""
import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .config import settings
from .database import Base, engine
from .routers_admin import router as admin_router
from .routers_auth import router as auth_router
from .routers_ledger import router as ledger_router
from .routers_users import router as users_router

app = FastAPI(title="黄老吉记账 API", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"] if settings.is_dev else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ok(data: object = None, msg: str = "ok") -> dict:
    return {"code": 0, "data": data, "msg": msg}


# 不包信封的路径前缀（文档/开放接口描述）
_ENVELOPE_EXEMPT = ("/api/docs", "/api/openapi", "/redoc")


@app.middleware("http")
async def envelope_middleware(request: Request, call_next):
    """统一响应信封：所有 /api 的 2xx JSON 响应包装为 {code, data, msg}"""
    response = await call_next(request)
    path = request.url.path
    if (
        path.startswith("/api")
        and not path.startswith(_ENVELOPE_EXEMPT)
        and 200 <= response.status_code < 300
        and response.headers.get("content-type", "").startswith("application/json")
    ):
        chunks: list[bytes] = []
        async for chunk in response.body_iterator:  # type: ignore[attr-defined]
            chunks.append(chunk)
        body = json.loads(b"".join(chunks) or b"null")
        return JSONResponse(content=ok(body), status_code=response.status_code)
    return response


@app.exception_handler(HTTPException)
async def http_exc_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"code": exc.status_code, "data": None, "msg": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exc_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    # 取第一条校验错误转成中文提示
    msg = "参数不正确"
    errs = exc.errors()
    if errs:
        first = errs[0]
        err = first.get("exc")
        if isinstance(err, ValidationError) and err.errors():
            msg = err.errors()[0].get("msg", msg)
        else:
            msg = str(err) if err else msg
    return JSONResponse(status_code=422, content={"code": 422, "data": None, "msg": msg})


@app.exception_handler(Exception)
async def unhandled_exc_handler(_: Request, exc: Exception) -> JSONResponse:
    if settings.is_dev:
        raise exc
    return JSONResponse(status_code=500, content={"code": 500, "data": None, "msg": "服务器开小差了，请稍后重试"})


app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(ledger_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/api/health")
def health():
    # 中间件会统一包信封
    return {"status": "up"}


def _migrate_and_promote() -> None:
    """轻量迁移：为已有 users 表补 role / disabled 列（生产建议迁 Alembic）"""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if not insp.has_table("users"):
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    with engine.begin() as conn:
        if "role" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"))
        if "disabled" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN disabled TINYINT(1) NOT NULL DEFAULT 0"))

    # 环境变量指定的用户提权为管理员
    if settings.admin_username:
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE users SET role = 'admin' WHERE username = :u AND role <> 'admin'"),
                {"u": settings.admin_username},
            )


@app.on_event("startup")
def startup() -> None:
    # 开发环境直接建表；生产改用 Alembic 迁移
    Base.metadata.create_all(bind=engine)
    _migrate_and_promote()
