# -*- coding: utf-8 -*-
"""端到端冒烟测试 — 通过 curl 发请求（兼容本机沙箱环境）"""
import json
import subprocess

BASE = "http://127.0.0.1:8000/api"


def call(method, path, body=None, token=None, expect_error=False):
    args = ["curl", "-s", "-X", method, BASE + path, "-H", "Content-Type: application/json"]
    if token:
        args += ["-H", f"Authorization: Bearer {token}"]
    if body is not None:
        args += ["-d", json.dumps(body, ensure_ascii=False)]
    out = subprocess.run(args, capture_output=True, text=True, encoding="utf-8").stdout
    payload = json.loads(out)
    ok = payload.get("code") == 0
    if not ok and not expect_error:
        raise AssertionError(f"{method} {path} -> {payload}")
    return payload


print("== 1. 注册（验证码）==")
code = call("POST", "/auth/register/code", {"email": "demo@test.com"})["data"]["dev_code"]
reg = call("POST", "/auth/register", {
    "email": "demo@test.com", "code": code, "username": "demo",
    "password": "abc12345", "display_name": "演示用户", "phone": "13800001111",
})
access, refresh = reg["data"]["access_token"], reg["data"]["refresh_token"]
print("注册成功:", reg["data"]["user"])

print("== 2. 默认分类/账户 ==")
cats = call("GET", "/categories", token=access)["data"]
accs = call("GET", "/accounts", token=access)["data"]
print(f"分类数: {len(cats)}, 第一项: {cats[0]}")
print(f"账户数: {len(accs)}, 第一项: {accs[0]}")
acc1, cat1 = accs[0]["id"], cats[0]["id"]

print("== 3. 新增交易（支出 25.5）==")
import datetime
today = datetime.date.today().isoformat()
tx = call("POST", "/transactions", {
    "type": "expense", "amount": 25.5, "category": cat1, "account": acc1,
    "description": "测试午餐", "date": today, "tags": ["测试"],
}, token=access)
print("创建:", tx["data"])
bal = call("GET", "/accounts", token=access)["data"][0]["balance"]
assert bal == -25.5, f"余额应为 -25.5，实际 {bal}"
print("账户余额联动正确:", bal)

print("== 4. 预算 ==")
bud = call("POST", "/budgets", {"category": cat1, "amount": 2000}, token=access)
print("创建预算:", bud["data"])
dup = call("POST", "/budgets", {"category": cat1, "amount": 3000}, token=access, expect_error=True)
assert dup["code"] == 409, dup
print("重复预算被拒:", dup["msg"])

print("== 5. 月筛选 ==")
month = today[:7]
txs = call("GET", f"/transactions?month={month}", token=access)["data"]
print(f"本月交易数: {len(txs)}")

print("== 6. 刷新 token（轮换 + 旧作废）==")
r1 = call("POST", "/auth/refresh", {"refresh_token": refresh})
assert "access_token" in r1["data"]
old = call("POST", "/auth/refresh", {"refresh_token": refresh}, expect_error=True)
assert old["code"] == 401, old
print("刷新成功，旧 refresh 已作废:", old["msg"])
access = r1["data"]["access_token"]

print("== 7. 资料修改 ==")
denied = call("PATCH", "/users/me", {"email": None, "phone": None}, token=access, expect_error=True)
assert denied["code"] == 400, denied
print("同时清空两个联系方式被拒:", denied["msg"])
me = call("PATCH", "/users/me", {"display_name": "改名了"}, token=access)["data"]
print("改名成功:", me["displayName"])

import time

print("== 8. 找回密码 ==")
for _ in range(12):  # 频控期间等待重试（同邮箱 60s 一封）
    r = call("POST", "/auth/password/reset-code", {"username": "demo", "email": "demo@test.com"}, expect_error=True)
    if r["code"] == 0:
        break
    print("  频控中，等待 10s:", r["msg"])
    time.sleep(10)
code2 = r["data"]["dev_code"]
call("POST", "/auth/password/reset", {"email": "demo@test.com", "code": code2, "new_password": "xyz98765"})
login2 = call("POST", "/auth/login", {"username": "demo", "password": "xyz98765"})
assert "access_token" in login2["data"]
print("新密码登录成功")

print("== 9. 删除有交易的分类应 409 ==")
err = call("DELETE", f"/categories/{cat1}", token=access, expect_error=True)
assert err["code"] == 409, err
print("删除被拒:", err["msg"])

print("== 10. 未登录访问应 401 ==")
err2 = call("GET", "/transactions", expect_error=True)
assert err2["code"] == 401, err2
print("拦截:", err2["msg"])

print("\n全部通过 ✅")
