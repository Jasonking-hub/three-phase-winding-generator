# 三相绕组接线图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在槽极配结果中生成随 Q、P、ABC/UVW 和 BC 相互换实时更新的清晰三相线圈接线图。

**Architecture:** `app/winding.js` 新增纯数据分组函数，将现有绕组行按显示相别整理成接线图组。`app/WindingDiagram.tsx` 只负责按这些数据绘制 SVG 槽位、线圈、端部标记与三相串联主线；`app/page.tsx` 负责位置和状态传递，`app/globals.css` 负责工程图颜色、滚动与响应式布局。

**Tech Stack:** React、TypeScript、现有 CSS、Node test、Vinext。

## Global Constraints

- 主标题固定为“槽极配生成器”。
- A/U 橙色，B/V 蓝色，C/W 绿色。
- 不引入第三方依赖，不绘制铁芯、胶水或仿真底图。
- 接线图、表格和端子说明必须从同一个 `generateWinding` 结果更新。
- 高槽数与窄屏使用横向滚动，不能压缩槽号与端子文字。

---

### Task 1: 接线图数据映射

**Files:**
- Modify: `app/winding.js`
- Modify: `tests/winding.test.mjs`

**Interfaces:**
- Consumes: `generateWinding({ slots, poles, notation, swapBC })` 的 `rows` 与 `connections`。
- Produces: `buildWindingDiagram(rows, connections)`，返回 `{ phase, displayPhase, terminal, coils }[]`；每个线圈含 `coil`、`upperSlot`、`lowerSlot`、`upperMark`、`lowerMark`、`polarity`。

- [ ] **Step 1: 写失败测试**

```js
import { buildWindingDiagram, generateWinding } from "../app/winding.js";

test("groups winding rows for ABC, UVW, and swapped phase diagrams", () => {
  const abc = generateWinding({ slots: 12, poles: 10, notation: "ABC" });
  assert.deepEqual(
    buildWindingDiagram(abc.rows, abc.connections).map(({ displayPhase }) => displayPhase),
    ["A", "B", "C"],
  );
  const uvw = generateWinding({ slots: 12, poles: 10, notation: "UVW" });
  assert.deepEqual(
    buildWindingDiagram(uvw.rows, uvw.connections).map(({ displayPhase }) => displayPhase),
    ["U", "V", "W"],
  );
  const swapped = generateWinding({ slots: 12, poles: 10, notation: "ABC", swapBC: true });
  assert.deepEqual(
    buildWindingDiagram(swapped.rows, swapped.connections).map(({ displayPhase }) => displayPhase),
    ["A", "C", "B"],
  );
});
```

- [ ] **Step 2: 确认测试失败**

Run: `node --test tests/winding.test.mjs`

Expected: FAIL with `buildWindingDiagram` export missing.

- [ ] **Step 3: 最小实现**

```js
export function buildWindingDiagram(rows, connections) {
  return connections.map(({ phase, displayPhase, terminal }) => ({
    phase,
    displayPhase,
    terminal,
    coils: rows
      .filter((row) => row.phase === phase)
      .map(({ coil, upperSlot, lowerSlot, upperMark, lowerMark, polarity }) => ({
        coil,
        upperSlot,
        lowerSlot,
        upperMark,
        lowerMark,
        polarity,
      })),
  }));
}
```

- [ ] **Step 4: 确认测试通过**

Run: `node --test tests/winding.test.mjs`

Expected: PASS，包含新分组测试与现有绕组测试。

- [ ] **Step 5: 提交**

```bash
git add app/winding.js tests/winding.test.mjs
git commit -m "Add winding diagram data"
```

### Task 2: 绘制三相线圈接线图

**Files:**
- Create: `app/WindingDiagram.tsx`
- Modify: `tests/seo.test.mjs`

**Interfaces:**
- Consumes: `winding`，其中含 `valid`、`rows`、`connections`；使用 `buildWindingDiagram(winding.rows, winding.connections)`。
- Produces: `WindingDiagram({ winding }: { winding: ReturnType<typeof generateWinding> })`。

- [ ] **Step 1: 写失败测试**

```js
test("renders a three-phase coil-only connection diagram", async () => {
  const component = await readFile(new URL("../app/WindingDiagram.tsx", import.meta.url), "utf8");
  assert.match(component, /buildWindingDiagram/);
  assert.match(component, /三相接线图/);
  assert.match(component, /<svg/);
  assert.match(component, /upperMark/);
  assert.match(component, /lowerMark/);
});
```

- [ ] **Step 2: 确认测试失败**

Run: `node --test tests/seo.test.mjs`

Expected: FAIL with `ENOENT` for `app/WindingDiagram.tsx`.

- [ ] **Step 3: 最小实现**

```tsx
import { buildWindingDiagram } from "./winding.js";

const PHASE_STROKE = {
  A: "#bc6200", U: "#bc6200",
  B: "#245ba9", V: "#245ba9",
  C: "#007a70", W: "#007a70",
};

function coilPath(startX: number, endX: number, coilY: number) {
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  return `M ${left} 314 V ${coilY + 10} Q ${left} ${coilY} ${left + 10} ${coilY} H ${right - 10} Q ${right} ${coilY} ${right} ${coilY + 10} V 314`;
}

export default function WindingDiagram({ winding }: { winding: { valid: boolean; rows: Array<{ coil: number; upperSlot: number; lowerSlot: number; upperMark: string; lowerMark: string; polarity: string }>; connections: Array<{ phase: string; displayPhase: string; terminal: string }> } }) {
  if (!winding.valid) {
    return <div className="diagram-empty">输入有效的 Q 和 P 后显示三相接线图。</div>;
  }

  const groups = buildWindingDiagram(winding.rows, winding.connections);
  const width = Math.max(820, 96 + winding.rows.length * 64);
  const slotX = (slot: number) => 72 + (slot - 1) * 64;

  return (
    <section className="winding-diagram" aria-labelledby="diagram-title">
      <div className="diagram-heading">
        <h3 id="diagram-title">三相接线图</h3>
        <p>同相线圈按主线串联。槽号与正负端随当前相别同步更新。</p>
      </div>
      <div className="diagram-scroll">
        <svg viewBox={`0 0 ${width} 440`} role="img" aria-label="三相线圈接线图">
          <title>三相线圈接线图</title>
          {winding.rows.map((row) => {
            const x = slotX(row.upperSlot);
            return <g key={`slot-${row.upperSlot}`} className="diagram-slot"><line x1={x} x2={x} y1="298" y2="334" /><text x={x} y="356">{row.upperSlot}</text></g>;
          })}
          {groups.map((group, groupIndex) => {
            const stroke = PHASE_STROKE[group.displayPhase as keyof typeof PHASE_STROKE];
            const busY = 38 + groupIndex * 70;
            return (
              <g key={group.phase} style={{ color: stroke }}>
                <text className="diagram-phase-label" x="16" y={busY + 5}>{group.displayPhase} 相</text>
                <text className="diagram-terminal" x={width - 18} y={busY + 5} textAnchor="end">{group.terminal}</text>
                <path className="diagram-bus" d={`M 62 ${busY} H ${width - 26}`} />
                {group.coils.map((coil, coilIndex) => {
                  const startX = slotX(coil.upperSlot);
                  const endX = slotX(coil.lowerSlot);
                  const coilY = 252 - (coilIndex % 3) * 34;
                  return (
                    <g key={coil.coil}>
                      <path className="diagram-lead" d={`M ${startX} ${busY} V ${coilY}`} />
                      <path className="diagram-coil" d={coilPath(startX, endX, coilY)} />
                      <text className="diagram-mark" x={startX} y="385">{coil.upperMark}</text>
                      <text className="diagram-mark" x={endX} y="408">{coil.lowerMark}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
```

具体 SVG 规则：`slotX = 72 + (slot - 1) * 64`，宽度为 `Math.max(820, 96 + winding.rows.length * 64)`；每个线圈从上层槽落到其相别的错开线圈层后连至下层槽；每相主线、端子和线圈端部使用同一 `PHASE_STROKE[displayPhase]`。

- [ ] **Step 4: 确认测试通过**

Run: `node --test tests/seo.test.mjs`

Expected: PASS，接线图组件包含数据映射、SVG、标题和两端标记。

- [ ] **Step 5: 提交**

```bash
git add app/WindingDiagram.tsx tests/seo.test.mjs
git commit -m "Add three phase winding diagram"
```

### Task 3: 页面集成与工程图样式

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/seo.test.mjs`

**Interfaces:**
- Consumes: `WindingDiagram` 与现有 `winding` memo 值。
- Produces: 标题、结果面板接线图区、A/U 橙、B/V 蓝、C/W 绿的统一展示。

- [ ] **Step 1: 写失败测试**

```js
test("places the winding diagram below the connection table with the requested title", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /槽极配生成器/);
  assert.match(page, /<WindingDiagram winding={winding} \/>/);
  assert.match(css, /\.winding-diagram/);
  assert.match(css, /#bc6200/);
  assert.match(css, /#245ba9/);
  assert.match(css, /#007a70/);
});
```

- [ ] **Step 2: 确认测试失败**

Run: `node --test tests/seo.test.mjs`

Expected: FAIL，因为页面未引入接线图组件，且标题仍为旧文案。

- [ ] **Step 3: 最小实现**

```tsx
import WindingDiagram from "./WindingDiagram";

<h1>槽极配生成器</h1>
// 在表格或空状态之后、结果面板结束之前插入。
<WindingDiagram winding={winding} />
```

```css
.site-shell { padding-top: 22px; }
.winding-diagram { margin-top: 24px; overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); }
.winding-diagram svg { display: block; min-width: 820px; }
@media (max-width: 860px) { .site-shell { padding-top: 16px; } }
```

组件内相色常量同时用于线条、端子、标签；现有 `.phase-a`、`.phase-b`、`.phase-c` 的变量调整为 A/U 橙、B/V 蓝、C/W 绿，保证图例、表格和端子卡片一致。

- [ ] **Step 4: 确认测试与构建通过**

Run: `node --test tests/seo.test.mjs tests/winding.test.mjs`

Expected: PASS，所有测试通过。

Run: `.\\node_modules\\.bin\\vinext.cmd build`

Expected: exit code 0，生成 `dist/server/index.js` 与静态资源。

- [ ] **Step 5: 提交**

```bash
git add app/page.tsx app/globals.css tests/seo.test.mjs
git commit -m "Integrate winding diagram"
```

### Task 4: 发布更新

**Files:**
- Modify: 发布产物，仅由现有 Sites 流程生成。

**Interfaces:**
- Consumes: 已通过测试的 `main` HEAD 和 `dist/`。
- Produces: 已更新的公开网站。

- [ ] **Step 1: 打包并检查**

Run: 使用现有 Sites 打包流程生成部署包。

Expected: 部署包包含 `dist/server/index.js`、`dist/client` 静态资源和 `dist/.openai/hosting.json`。

- [ ] **Step 2: 保存版本并公开部署**

Run: 使用现有 Sites 项目保存构建版本并部署到已有公开站点。

Expected: 部署状态为 `succeeded`，站点 URL 保持不变。

- [ ] **Step 3: 最终验证**

Run: `node --test tests/seo.test.mjs tests/winding.test.mjs`

Expected: PASS，8 项既有测试与新增接线图测试均通过。

- [ ] **Step 4: 清理发布包**

Run: 删除仅用于上传的 `site-package.tar.gz`。

Expected: Git 工作区无未提交代码变化。

## Self-Review

- Spec coverage: Task 1 实现同步数据源；Task 2 实现线圈、槽号、端子和三相线路；Task 3 实现标题、上移布局、颜色与滚动；Task 4 验证并发布。
- Placeholder scan: 无未完成占位词，无模糊错误处理指令。
- Type consistency: `buildWindingDiagram(rows, connections)` 由 Task 1 导出，Task 2 消费；`WindingDiagram` 由 Task 2 导出，Task 3 消费；所有步骤使用同一 `winding` 结果。
