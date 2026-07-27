# 中欣工具箱实施计划

> **执行要求：** 必须使用 `superpowers:subagent-driven-development` 按任务推进；计算逻辑必须使用 `superpowers:test-driven-development` 先写失败测试；完成前必须使用 `superpowers:verification-before-completion`。

**目标：** 把现有单页槽极配站点改造成含首页、槽极配、漆包线排线和线圈电阻四个静态路由的“中欣工具箱”，并保证两个新工具严格复刻 Excel。

**架构：** Next/Vinext App Router 继续静态导出。首页由共享工具注册表生成；每个计算器拆为纯 JavaScript 计算模块、客户端表单组件、服务端页面元数据和独立 CSS Module。共享 SEO、导航、全局 token 和最终集成由主代理维护，三个无共享写入的功能区交给并行子代理。

**技术栈：** Next.js 16、React 19、Vinext、TypeScript/JavaScript、CSS Modules、Node `node:test`、Netlify 静态部署。

**依据：** `README.md`、`DESIGN.md`、`docs/superpowers/specs/2026-07-27-zx-toolbox-design.md`。

## 并行边界

基础路由迁移完成后，主代理同时启动三个 `gpt-5.6-terra`、`medium` 子代理：

| 执行者 | 独占文件 | 任务 |
| --- | --- | --- |
| 首页子代理 | `app/tools.js`、`app/HomeToolRail.tsx`、`app/home.module.css`、`app/page.tsx`、`tests/home.test.mjs` | 任务 3 |
| 排线子代理 | `app/wire-layout/**`、`tests/wire-layout.test.mjs` | 任务 4、5 |
| 电阻子代理 | `app/coil-resistance/**`、`tests/coil-resistance.test.mjs` | 任务 6、7 |
| 主代理 | 其余文件 | 任务 1、2、8、9；集成与审查 |

子代理不得修改 `package.json`、`app/layout.tsx`、`app/globals.css`、`app/seo.js`、`app/sitemap.js`、`app/robots.js`、`public/**`、`README.md`、`DESIGN.md`。主代理在子代理运行期间不得编辑其独占文件。

---

## 任务 1：建立可扩展测试入口

**文件：**

- 修改：`package.json`
- 验证：`tests/winding.test.mjs`
- 验证：`tests/seo.test.mjs`

### 步骤 1：确认现有测试状态

运行：

```powershell
pnpm exec node --test tests/winding.test.mjs tests/seo.test.mjs
```

预期：现有绕组和 SEO 测试通过；记录任何与环境有关而非业务逻辑的失败。

### 步骤 2：修正测试脚本

将 `package.json` 的脚本改为：

```json
{
  "test": "node --test tests/*.test.mjs",
  "test:build": "pnpm build"
}
```

保留现有 `dev`、`build`、`start`、`lint` 和数据库脚本。

### 步骤 3：验证统一入口

运行：

```powershell
pnpm test
```

预期：当前已有测试全部通过。

### 步骤 4：提交

```powershell
git add package.json
git commit -m "test: establish toolbox test runner"
```

---

## 任务 2：迁移槽极配到独立路由

**文件：**

- 新建：`app/slot-pole/page.tsx`
- 新建：`app/slot-pole/layout.tsx`
- 删除：原用途的 `app/page.tsx`（随后由任务 3 创建首页）
- 修改：`tests/seo.test.mjs`
- 验证：`app/winding.js`
- 验证：`app/WindingDiagram.tsx`

### 步骤 1：先写公开路由失败测试

在 `tests/seo.test.mjs` 通过 `sitemap()` 的可观察输出断言 `/slot-pole` 已成为公开路由：

```js
test("slot-pole calculator has a public route", () => {
  const paths = sitemap().map((entry) => new URL(entry.url).pathname);
  assert.ok(paths.includes("/slot-pole"));
});
```

运行：

```powershell
pnpm exec node --test tests/seo.test.mjs
```

预期：因当前 sitemap 只有根路由而失败。

### 步骤 2：移动页面且只改导入路径

把现有 `app/page.tsx` 内容移到 `app/slot-pole/page.tsx`，相对导入改为：

```ts
import { generateWinding } from "../winding.js";
import WindingDiagram from "../WindingDiagram";
import SeoContent from "../SeoContent";
```

不得修改 `generateWinding` 的输入、输出或绕组图交互。

### 步骤 3：添加页面元数据壳

`app/slot-pole/layout.tsx` 导出槽极配独立 metadata，并原样渲染 `children`。canonical 必须为 `/slot-pole`。

### 步骤 4：回归验证

运行：

```powershell
pnpm exec node --test tests/winding.test.mjs tests/seo.test.mjs
```

预期：全部通过。

### 步骤 5：提交

```powershell
git add app/slot-pole tests/seo.test.mjs
git commit -m "refactor: move slot pole calculator to dedicated route"
```

---

## 任务 3：首页与动态工具区（首页子代理）

**文件：**

- 新建：`app/tools.js`
- 新建：`app/HomeToolRail.tsx`
- 新建：`app/home.module.css`
- 新建：`app/page.tsx`
- 新建：`tests/home.test.mjs`

### 步骤 1：写失败测试

`tests/home.test.mjs` 至少覆盖：

```js
test("registry exposes the three public tools in order", async () => {
  const { TOOL_REGISTRY } = await import("../app/tools.js");
  assert.deepEqual(
    TOOL_REGISTRY.map(({ id, href }) => [id, href]),
    [
      ["slot-pole", "/slot-pole"],
      ["wire-layout", "/wire-layout"],
      ["coil-resistance", "/coil-resistance"],
    ],
  );
});
```

静态页面可观察行为放到任务 9 的构建产物测试：H1 为“中欣工具箱”、三个 href 正确、“更多工具”不是空链接。hover、focus、Enter/Space、动效、reduced-motion 和移动端单列在任务 9 用真实浏览器验收，不用源码字符串断言冒充交互测试。

运行：

```powershell
pnpm exec node --test tests/home.test.mjs
```

预期：因文件尚不存在而失败。

### 步骤 2：建立唯一工具注册表

接口固定为：

```js
export const TOOL_REGISTRY = [
  { id, index, name, href, description, visual },
];
```

顺序固定为槽极配、漆包线排线、线圈电阻；`visual` 分别为 `slotPole`、`wirePacking`、`resistance`。

### 步骤 3：实现可访问动态工具区

`HomeToolRail` 使用本地 `activeId`：桌面默认 `slot-pole`，pointer/focus 更新活动项。每个工具整体为真实链接；Enter/Space 均可导航，不嵌套按钮。活动项通过 `data-active` 与 `aria-current` 表达。

识别图形要求：

- 槽极配只显示 `Q : P`。
- 排线图用 CSS/SVG 画三层圆线截面，偶数层水平偏移半径，并显示左、下边界。
- 电阻图显示 `Ω` 和小型 `ρL/A` 分式。
- 卡片底部不显示任何公式说明。

### 步骤 4：实现响应式和动效

桌面活动项 `flex-grow: 2.25`，非活动项 `0.82`；动画仅使用 `flex-grow`、`transform`、`opacity`、颜色，时长 `540ms`。`<1024px` 纵向完整展示；reduced-motion 设为近乎即时且取消位移。

### 步骤 5：测试与提交

```powershell
pnpm exec node --test tests/home.test.mjs
git add app/tools.js app/HomeToolRail.tsx app/home.module.css app/page.tsx tests/home.test.mjs
git commit -m "feat: build Zhongxin toolbox homepage"
```

---

## 任务 4：漆包线排线纯函数（排线子代理）

**文件：**

- 新建：`app/wire-layout/wire-layout.js`
- 新建：`tests/wire-layout.test.mjs`

### 步骤 1：写 Excel 默认样例失败测试

纯函数接口：

```js
export const PACKING_MODES = {
  SAME: "same-count",
  BOUNDARY: "within-boundary",
};

export function calculateLayerDimensions({ diameter, layers, roots, mode }) {}
export function calculateCapacity({ diameter, maxWidth, maxThickness, mode }) {}
```

首批断言使用容差助手：

```js
function closeTo(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

const forward = calculateLayerDimensions({
  diameter: 0.87,
  layers: 11,
  roots: 4,
  mode: PACKING_MODES.SAME,
});
closeTo(forward.result.verticalPitch, 0.7534421012924616);
closeTo(forward.result.offset, 0.435);
closeTo(forward.result.height, 8.404421012924615);
closeTo(forward.result.width, 3.915);
assert.equal(forward.result.total, 44);

const reverse = calculateCapacity({
  diameter: 0.62,
  maxWidth: 1.8,
  maxThickness: 3.6,
  mode: PACKING_MODES.SAME,
});
assert.equal(reverse.result.layers, 6);
assert.equal(reverse.result.roots, 2);
closeTo(reverse.result.actualHeight, 3.30467875173176);
closeTo(reverse.result.actualWidth, 1.55);
closeTo(reverse.result.widthRemaining, 0.25);
closeTo(reverse.result.thicknessRemaining, 0.29532124826824013);
assert.equal(reverse.result.total, 12);
```

运行：

```powershell
pnpm exec node --test tests/wire-layout.test.mjs
```

预期：因模块不存在而失败。

### 步骤 2：实现最小公式

返回结构统一为：

```js
{ valid: boolean, errors: Record<string, string>, warning: string, result: object | null }
```

严格实现规格第 8 节公式，不使用近似 π，不给边界反推增加额外优化。

### 步骤 3：补齐边界失败测试

覆盖：

- 两种模式的多层总根数与宽度差异。
- 单层时“每层同根数”不增加半径。
- 边界内错排 `M >= 2 && N < 2` 的原文警告。
- 反推时 `D <= 0`、`Tmax < D`、`Wmax < D` 的零结果规则。
- 同根数模式 `Wmax < 1.5D` 原文警告。
- 非整数层数/根数和非有限值返回字段错误。

预期警告文字必须逐字匹配设计规格。

### 步骤 4：再次运行并提交

```powershell
pnpm exec node --test tests/wire-layout.test.mjs
git add app/wire-layout/wire-layout.js tests/wire-layout.test.mjs
git commit -m "feat: replicate enamel wire packing formulas"
```

---

## 任务 5：漆包线排线页面（排线子代理）

**文件：**

- 新建：`app/wire-layout/WireLayoutCalculator.tsx`
- 新建：`app/wire-layout/page.tsx`
- 新建：`app/wire-layout/layout.tsx`
- 新建：`app/wire-layout/wire-layout.module.css`
- 修改：`tests/wire-layout.test.mjs`

### 步骤 1：写 UI 所依赖的格式化行为失败测试

在计算模块导出 `formatDimension` 和 `formatInteger`，测试整数不显示小数、尺寸显示三位且无效值不输出 `NaN`/Infinity。页面语义、默认值和真实梅花形密排预览在任务 9 通过构建产物与真实浏览器验收。

### 步骤 2：实现客户端计算器

表单字符串状态先解析为有限数，再调用纯函数。输入背景、输出背景、警告样式使用全局语义 token。尺寸显示三位小数，整数不显示小数；内部结果不 round。

预览根据当前 `M/N/mode` 生成受上限保护的 SVG 圆阵；当实际数量很大时按可见窗口截断并明确标注，不改变计算结果。

### 步骤 3：实现页面和独立 metadata

`page.tsx` 为服务端页面，渲染标题、工作簿假设说明和客户端计算器。`layout.tsx` 的 canonical 为 `/wire-layout`，title 和 description 仅描述漆包线排线。

### 步骤 4：验证与提交

```powershell
pnpm exec node --test tests/wire-layout.test.mjs
git add app/wire-layout tests/wire-layout.test.mjs
git commit -m "feat: add enamel wire layout calculator page"
```

---

## 任务 6：线圈电阻纯函数（电阻子代理）

**文件：**

- 新建：`app/coil-resistance/coil-resistance.js`
- 新建：`tests/coil-resistance.test.mjs`

### 步骤 1：写 Excel 默认样例失败测试

固定接口与常量：

```js
export const PI_CIRCLE = 3.141592653;
export const PI_MOTOR = 3.1415926535;
export const COPPER_RESISTIVITY = 17.24;
export function calculateRoundCoil(input) {}
export function calculateMotorCoil(input) {}
```

默认样例至少断言：

```js
const round = calculateRoundCoil({
  wireDiameter: 0.61,
  outerDiameter: 71.8,
  innerDiameter: 65.2,
  turns: 228,
});
closeTo(round.result.coilResistance, 2.8944296694436975);

const motor = calculateMotorCoil({
  wireDiameter: 0.8,
  outerLength: 158,
  outerWidth: 23.5,
  innerLength: 140,
  innerWidth: 5.5,
  turns: 44,
  resistivity: 17.24,
  branchesPerPhase: 1,
  coilsPerBranch: 1,
});
closeTo(motor.result.coilResistance, 0.4934780447340384);
closeTo(motor.result.phaseResistance, 0.4934780447340384);
closeTo(motor.result.phaseToPhaseResistance, 0.9869560894680768);
```

运行后预期模块缺失失败。

### 步骤 2：实现最小公式

返回 `{ valid, errors, result }`。严格使用工作簿常量，禁止 `Math.PI`。长度使用 `mm`，最终按 `/ 1_000_000` 转为 Ω。

### 步骤 3：补齐验证测试

覆盖：

- 两种模型的面积、内外匝长、平均匝长和铜线总长。
- 线径、尺寸、电阻率、支路数、每支路线圈数为零或非有限值。
- 匝数、支路数、每支路线圈数非整数。
- 外圈尺寸小于内圈尺寸时仍按 Excel 平均公式计算，不擅自拒绝。

### 步骤 4：验证与提交

```powershell
pnpm exec node --test tests/coil-resistance.test.mjs
git add app/coil-resistance/coil-resistance.js tests/coil-resistance.test.mjs
git commit -m "feat: replicate coil resistance formulas"
```

---

## 任务 7：线圈电阻页面（电阻子代理）

**文件：**

- 新建：`app/coil-resistance/CoilResistanceCalculator.tsx`
- 新建：`app/coil-resistance/page.tsx`
- 新建：`app/coil-resistance/layout.tsx`
- 新建：`app/coil-resistance/coil-resistance.module.css`
- 修改：`tests/coil-resistance.test.mjs`

### 步骤 1：写 UI 所依赖的格式化行为失败测试

在计算模块导出 `formatLength` 和 `formatResistance`，测试长度三位、电阻六位且无效值不输出 `NaN`/Infinity。圆形线圈/电机线圈区块、默认值、单位、错误关联、live region 与工作簿假设在任务 9 通过构建产物和真实浏览器验收。

### 步骤 2：实现客户端计算器

两个模型分别管理输入，不互相覆盖。所有计算同步完成；长度显示三位小数，面积和电阻显示六位小数。无效输入保留原文本，不显示 `NaN`、Infinity 或 `#DIV/0!`。

### 步骤 3：实现页面和 metadata

`page.tsx` 渲染标题、说明和计算器。`layout.tsx` canonical 为 `/coil-resistance`，不得复用槽极配关键词堆砌。

### 步骤 4：验证与提交

```powershell
pnpm exec node --test tests/coil-resistance.test.mjs
git add app/coil-resistance tests/coil-resistance.test.mjs
git commit -m "feat: add coil resistance calculator page"
```

---

## 任务 8：共享外壳、视觉 token、SEO 与静态抓取文件（主代理）

**文件：**

- 新建：`app/SiteHeader.tsx`
- 新建：`app/SiteFooter.tsx`
- 修改：`app/layout.tsx`
- 修改：`app/globals.css`
- 修改：`app/seo.js`
- 修改：`app/sitemap.js`
- 修改：`app/robots.js`
- 修改：`public/robots.txt`
- 修改：`public/sitemap.xml`
- 更新：`public/og.png`
- 修改：`tests/seo.test.mjs`

### 步骤 1：先改 SEO 测试并确认失败

断言：

```js
assert.equal(SITE_URL, "https://zx-toolbox.netlify.app");
assert.deepEqual(
  sitemap().map((entry) => new URL(entry.url).pathname),
  ["/", "/slot-pole", "/wire-layout", "/coil-resistance"],
);
```

再通过导出函数的真实返回值断言 robots 指向新域名、首页 schema 类型为 `WebSite`、三个工具 schema 类型为 `WebApplication`。静态 `public/robots.txt`、`public/sitemap.xml` 与 HTML 的最终内容由任务 9 对构建产物验证。

运行：

```powershell
pnpm exec node --test tests/seo.test.mjs
```

预期：旧域名与单路由实现导致失败。

### 步骤 2：建立共享站点外壳

导航高度 68px，品牌文案“中欣工具箱”，品牌链接 `/`，工具导航来自 `TOOL_REGISTRY`，子页可直接返回“全部工具”。页脚只写本地计算和工具范围，不添加外部营销链接。

### 步骤 3：落实 DESIGN.md token

在 `:root` 建立全部语义变量：ink、brand、graphic、paper、surface、secondary、line、input、output、error、success、warning、三相色、间距、圆角、阴影。现有槽极配选择器改用变量但不重写其计算图结构。

全局保证：`box-sizing`、中文字体栈、等宽数字类、可见 `:focus-visible`、页面无水平溢出、触摸目标至少 44px。

### 步骤 4：更新 SEO 和结构化数据

`app/seo.js` 提供基础站点信息与按工具生成 metadata/schema 的函数；`layout.tsx` 只输出首页 `WebSite` 基础 schema，不让所有页面重复槽极配 schema。页面 layout 使用各自 canonical。

### 步骤 5：更新静态抓取文件和 OG 图

robots 与 sitemap 的动态/静态版本均使用新域名和四路由。用仓库既有方式生成 1200×630 的品牌图，必须包含“中欣工具箱”，不继续只显示槽极配。

### 步骤 6：测试与提交

```powershell
pnpm exec node --test tests/seo.test.mjs
git add app/SiteHeader.tsx app/SiteFooter.tsx app/layout.tsx app/globals.css app/seo.js app/sitemap.js app/robots.js public tests/seo.test.mjs
git commit -m "feat: integrate toolbox shell and SEO"
```

---

## 任务 9：集成、可访问性与最终验证（主代理）

**文件：**

- 修改：仅限验证发现的具体缺陷文件
- 验证：`netlify.toml`
- 验证：`next.config.ts`
- 验证：`dist/client/**`

### 步骤 1：审查三个子代理提交

逐项检查：

- 是否只修改独占文件。
- 是否先有失败测试再有实现。
- 公式、常量、默认值、中文警告是否逐字匹配规格。
- 首页是否没有卡片底部公式，排线图是否真实错排。
- 是否出现硬编码 Hex、无来源功能或过度动画。

发现问题时先新增/收紧测试，再做最小修复。

### 步骤 2：运行全套逻辑与静态检查

```powershell
pnpm test
pnpm lint
```

预期：零失败、零 ESLint 错误。

### 步骤 3：运行生产构建

```powershell
pnpm build
```

预期：构建成功，`dist/client` 包含：

```text
index.html
slot-pole/index.html
wire-layout/index.html
coil-resistance/index.html
```

若导出器使用等价扁平 HTML 命名，以实际静态路由清单为准，但四个 URL 必须可直接打开。

### 步骤 4：添加并运行构建产物行为测试

新建 `tests/rendered-html.test.mjs`，对 `dist/client` 的实际页面读取并解析可见 HTML，断言：

- 首页 H1 为“中欣工具箱”，三个工具链接指向正确路由。
- “更多工具”是说明区而不是空链接。
- 每个工具页有唯一标题、canonical、表单标签和默认值。
- sitemap、robots 和四个 HTML 页面均使用新域名。
- 可见文本无 `NaN`、Infinity、`#DIV/0!`、`#REF!`。

运行：

```powershell
pnpm exec node --test tests/rendered-html.test.mjs
```

预期：全部通过。测试断言最终构建行为，不读取 React/CSS 源文件。

### 步骤 5：检查构建产物

在 `dist/client` 搜索并确认：

- 新域名存在，旧域名不存在。
- 四个页面标题与 canonical 正确。
- 可见文本不存在 `NaN`、`Infinity`、`#DIV/0!`、`#REF!`。
- `netlify.toml` 仍发布 `dist/client`。

### 步骤 6：浏览器验收

使用本地生产构建或开发服务器检查：

- 桌面：三个首页工具依次 hover/focus，当前项丝滑扩展。
- 键盘：Tab 可达，Enter/Space 进入正确路由，焦点可见。
- 移动端：单列完整摘要，不依赖 hover，无页面级横向滚动。
- reduced-motion：无位移和延迟显隐。
- 两个 Excel 默认示例与测试数值一致。
- 槽极配生成、相别切换、表格、接线图和缩放正常。

### 步骤 7：最终提交

```powershell
git status --short
git add <仅本轮验证修复文件>
git commit -m "fix: complete Zhongxin toolbox integration"
```

若没有验证修复，不创建空提交。最终交付时报告测试、lint、build 和浏览器验收的实际结果；未运行的检查不得表述为已通过。
