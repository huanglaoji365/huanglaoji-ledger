# 黄老吉记账 · huanglaoji-ledger

一个基于 **Material 3 Expressive** 设计语言的个人财务管理应用。
Mobile / Tablet / Desktop 共享同一套 Design System，并按屏幕尺寸提供不同的信息架构与交互方式。

## 技术栈

- Vue 3.5（`<script setup>` + TypeScript）
- Vue Router 4（hash 模式，7 个路由级页面）
- Vite 6
- 无 UI 框架 —— 全部组件自研（Design Tokens + 可复用组件体系）
- 图表为自研 SVG 组件（面积图 / 柱状图 / 环形图 / Sparkline），零图表库依赖

## 运行

```bash
npm install
npm run dev        # 开发 http://127.0.0.1:5173
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览 dist
```

## 架构（对应需求 STEP 1–20）

```
src/
├── styles/
│   ├── tokens.css        # STEP 1–5 全部设计令牌（见下）
│   └── base.css          # reset / 焦点环 / 状态层 / 无障碍工具 / reduced-motion
├── data/                 # UI 与数据分离
│   ├── types.ts          # Transaction / Category / Account / Budget 统一结构
│   ├── seed.ts           # 确定性种子数据（近 6 个月，约 400 笔）
│   └── format.ts         # 金额 / 日期 / 百分比格式化（zh-CN）
├── composables/
│   ├── useLedger.ts      # 账本 store：聚合 / 预算进度 / 增删改 / 导出
│   ├── useUi.ts          # 主题 / 全局记账弹层 / Toast 队列
│   ├── useBreakpoint.ts  # 断点（mobile/tablet/desktop/large）
│   ├── useOverlay.ts     # 弹层滚动锁
│   └── useMisc.ts        # reduced-motion / 焦点圈定 / ResizeObserver
├── components/
│   ├── ui/               # STEP 10 基础组件（按钮/输入/弹层/反馈…）
│   ├── layout/           # STEP 6–9 AppShell / Sidebar / Rail / BottomNav / TopBar / PageHeader
│   ├── charts/           # STEP 11 SVG 图表族
│   └── finance/          # STEP 11 财务组件 + STEP 14 记账表单
├── pages/                # STEP 12–18 页面 = Layout + 组件组合 + 数据
└── router/
```

## Design Tokens（styles/tokens.css）

| 类别 | 内容 |
| --- | --- |
| Color | `primary`（暖金）、`secondary`、`tertiary`、`surface` 五级容器、`outline`，语义色 `income / expense / warning / success`（各含 container），8 色图表类别色板 |
| Typography | `display / headline / title / body / label` 三档 ×（size / weight / line-height / letter-spacing） |
| Spacing | 4 8 12 16 20 24 32 40 48 64 |
| Radius | small 8 / medium 12 / large 16 / extra-large 28 / full |
| Elevation | level-0 ~ level-3（M3 双阴影） |
| Motion | fast/short/medium/long + M3 emphasized 缓动；`prefers-reduced-motion` 全局降级 |
| 主题 | 通过 `light-dark()` + `color-scheme` 单点定义，浅色 / 深色 / 跟随系统；另提供 7 个品牌色相预设（暖金 / 海蓝 / 翠绿 / 天青 / 紫罗兰 / 酒红 / 石墨），预设只需声明 4 个品牌源色，次色、五级表面、轮廓等中性色由 `color-mix()` 统一派生，设置页可即时切换（持久化到 localStorage） |

页面与组件禁止散写颜色 / 圆角 / 间距，一律引用令牌。

## 响应式行为（Breakpoints）

| 断点 | 导航 | 交易列表 | 记账表单 | 图表 |
| --- | --- | --- | --- | --- |
| Mobile `<600` | TopBar + BottomNav（4 主项 +「更多」抽屉承载次级页）+ FAB | 按日分组卡片列表 | Bottom Sheet | 简化图例、短标签、2 条网格线 |
| Tablet `600–1023` | Navigation Rail + TopBar | 紧凑表格（隐藏账户列） | 居中 Modal | 降低信息密度 |
| Desktop `≥1024` | 完整 Sidebar（含净资产摘要），无 TopBar | 完整表格（可排序） | 右侧 Side Sheet | 完整坐标轴 / 悬浮 tooltip |
| Large `≥1440` | 同上，内容区加宽 | 同上 | 同上 | 同上 |

## 页面（7 路由 + 全局弹层）

总览 `/` · 交易明细 `/transactions` · 统计分析 `/analytics` · 预算管理 `/budgets` ·
账户管理 `/accounts` · 分类管理 `/categories` · 设置 `/settings` · 记一笔/编辑交易（响应式弹层）

## 可访问性

- 键盘可达：跳转链接、`focus-visible` 焦点环、弹层焦点圈定 + Esc 关闭、radiogroup 方向键
- 屏幕阅读器：`aria-current` 导航态、`role="dialog" aria-modal`、图表 `role="img"` + 汇总描述 + 隐藏数据表、`aria-live` 摘要
- 金额三重编码：颜色 + `+/-` 符号 + 「收入/支出」文字标签，颜色不是唯一信息通道
- 触控目标 ≥44px；底部导航避让 `safe-area-inset-bottom`
- `prefers-reduced-motion`：CSS 过渡归零 + JS 跳过入场动画
