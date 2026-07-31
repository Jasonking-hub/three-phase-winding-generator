# 线圈材料与重量计算实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为圆形与矩形线圈增加铜/铝材料选择和重量计算，取消所有数值参数预填，并计算整台三相电机线圈重量。

**Architecture:** 材料电阻率、密度与校验集中在 `coil-resistance.js`，两个计算函数只接收 `copper` 或 `aluminum` 材料标识并返回电阻、单线圈重量及矩形线圈整机重量。React 页面负责独立材料选择、空白数值状态、首次待输入状态和结果显示；工具注册表、SEO 与 README 只同步公开文案，不复制计算常量。

**Tech Stack:** Next.js 16、React 19、TypeScript 5.9、原生 ES modules、Node.js `node:test`、CSS Modules、Vinext 静态导出。

## Global Constraints

- 规格来源：`docs/superpowers/specs/2026-07-31-coil-material-weight-design.md`。
- 材料仅允许 `copper` 和 `aluminum`，页面名称分别为“铜线”和“铝线”。
- 铜线电阻率固定为 `17.24 μΩ·mm`，密度固定为 `8.96 × 10⁻⁶ kg/mm³`。
- 铝线电阻率固定为 `27.57 μΩ·mm`，密度固定为 `2.70 × 10⁻⁶ kg/mm³`。
- 圆形与矩形线圈材料各自选择，默认铜线，互不联动。
- 所有线径、尺寸、匝数、支路数和线圈数初始为空。
- 初始空表单显示待输入状态，不立即显示字段错误。
- 重量忽略漆皮、引出线、跨接线、接头、浸漆和工艺余量，统一显示 `kg`，保留六位小数。
- 矩形线圈整机重量使用 `单线圈重量 × 3 × 每相支路数 × 每支路线圈数`。
- 圆形和矩形几何公式、`PI_CIRCLE = 3.141592653`、`PI_MOTOR = 3.1415926535`、单相电阻和 P-P 电阻公式不得改变。
- 遵守 `DESIGN.md` Section 4“输入与选择器/结果面板”和 Section 8“Responsive Behavior”；不新增视觉 token。
- 保留当前工作区已有的“矩形线圈”命名、对应 `aria-label`、删除独立假设说明块和相关测试；不得 reset、checkout 或覆盖这些修改。
- 不修改历史规格 `docs/superpowers/specs/2026-07-27-zx-toolbox-design.md`；新规格已明确覆盖其默认输入要求。

---

## 文件结构

- `app/coil-resistance/coil-resistance.js`：材料常量、材料校验、电阻与重量纯计算、重量格式化。
- `tests/coil-resistance.test.mjs`：材料、电阻、重量、支路线圈数量和无效输入单元测试。
- `app/coil-resistance/CoilResistanceCalculator.tsx`：空白数值状态、两个材料选择器、首次待输入状态、重量结果。
- `app/coil-resistance/coil-resistance.module.css`：原生 `select` 与待输入提示样式。
- `tests/rendered-html.test.mjs`：静态导出的空白输入、默认铜线选项、页面文案和结构验证。
- `app/tools.js`：首页线圈电阻工具说明。
- `app/seo.js`：线圈电阻页面描述和关键词。
- `tests/home.test.mjs`：首页工具说明回归测试。
- `tests/seo.test.mjs`：铜线、铝线、电阻和重量 SEO 回归测试。
- `README.md`：材料常量、重量公式、空白初始状态和输出范围。

---

### Task 1: 材料、电阻与重量纯计算

**Files:**

- Modify: `tests/coil-resistance.test.mjs:4-110`
- Modify: `app/coil-resistance/coil-resistance.js:1-91`

**Interfaces:**

- Consumes:
  - `calculateRoundCoil({ material, wireDiameter, outerDiameter, innerDiameter, turns })`
  - `calculateMotorCoil({ material, wireDiameter, outerLength, outerWidth, innerLength, innerWidth, turns, branchesPerPhase, coilsPerBranch })`
- Produces:
  - `COIL_MATERIALS.copper = { label: "铜线", resistivity: 17.24, densityKgPerCubicMillimeter: 8.96e-6 }`
  - `COIL_MATERIALS.aluminum = { label: "铝线", resistivity: 27.57, densityKgPerCubicMillimeter: 2.7e-6 }`
  - 圆形结果新增 `coilWeight: number`
  - 矩形结果新增 `coilWeight: number`、`totalWeight: number`
  - `formatWeight(value: number): string`

- [ ] **Step 1: 先把现有示例改成显式材料输入并添加失败测试**

在 `tests/coil-resistance.test.mjs` 导入 `formatWeight`，为现有每个 `calculateRoundCoil` 和 `calculateMotorCoil` 调用添加 `material: "copper"`，删除全部 `resistivity` 输入与错误断言。增加以下测试：

```js
import {
  calculateMotorCoil,
  calculateRoundCoil,
  formatLength,
  formatResistance,
  formatWeight,
} from '../app/coil-resistance/coil-resistance.js';

const ROUND_SAMPLE = {
  material: 'copper',
  wireDiameter: 0.61,
  outerDiameter: 71.8,
  innerDiameter: 65.2,
  turns: 228,
};

const MOTOR_SAMPLE = {
  material: 'copper',
  wireDiameter: 0.8,
  outerLength: 158,
  outerWidth: 23.5,
  innerLength: 140,
  innerWidth: 5.5,
  turns: 44,
  branchesPerPhase: 1,
  coilsPerBranch: 1,
};

test('round coil uses selected material for resistance and weight', () => {
  const copper = calculateRoundCoil(ROUND_SAMPLE);
  const aluminum = calculateRoundCoil({ ...ROUND_SAMPLE, material: 'aluminum' });

  assertClose(copper.result.resistance, 2.8944296694436975);
  assertClose(copper.result.coilWeight, 0.12847920838611958);
  assertClose(aluminum.result.resistance, 4.628737006181134);
  assertClose(aluminum.result.coilWeight, 0.038715832884210144);
});

test('motor coil returns single-coil and three-phase total weight', () => {
  const copper = calculateMotorCoil(MOTOR_SAMPLE);
  const aluminum = calculateMotorCoil({ ...MOTOR_SAMPLE, material: 'aluminum' });

  assertClose(copper.result.coilResistance, 0.4934780447340384);
  assertClose(copper.result.coilWeight, 0.06480049063729275);
  assertClose(copper.result.totalWeight, 0.19440147191187823);
  assertClose(aluminum.result.coilResistance, 0.7891641353432389);
  assertClose(aluminum.result.coilWeight, 0.019526933562577057);
  assertClose(aluminum.result.totalWeight, 0.05858080068773117);
});

test('motor total weight multiplies branches, coils per branch, and three phases', () => {
  const calculation = calculateMotorCoil({
    ...MOTOR_SAMPLE,
    branchesPerPhase: 2,
    coilsPerBranch: 4,
  });

  assertClose(calculation.result.totalWeight, 1.5552117752950259);
  assertClose(calculation.result.phaseResistance, 0.9869560894680768);
  assertClose(calculation.result.lineToLineResistance, 1.9739121789361536);
});

test('calculators reject unsupported materials', () => {
  const calculation = calculateRoundCoil({ ...ROUND_SAMPLE, material: 'steel' });

  assert.equal(calculation.valid, false);
  assert.deepEqual(calculation.errors, { material: '请选择有效材料。' });
  assert.equal(calculation.result, null);
});
```

把现有格式化测试扩展为：

```js
assert.equal(formatWeight(0.19440147191187823), '0.194401');
assert.equal(formatWeight(Number.NaN), '—');
```

现有无效矩形输入测试改为 `material: "copper"`，期望错误字段只包含：

```js
['branchesPerPhase', 'coilsPerBranch', 'turns']
```

- [ ] **Step 2: 运行纯函数测试并确认它先失败**

Run:

```bash
node --test tests/coil-resistance.test.mjs
```

Expected: FAIL，模块尚未导出 `formatWeight`，或结果尚无 `coilWeight` / `totalWeight`。

- [ ] **Step 3: 用材料表替换可编辑电阻率并实现重量公式**

将 `app/coil-resistance/coil-resistance.js` 改成以下计算结构；保留现有几何中间结果字段：

```js
export const PI_CIRCLE = 3.141592653;
export const PI_MOTOR = 3.1415926535;

export const COIL_MATERIALS = {
  copper: {
    label: '铜线',
    resistivity: 17.24,
    densityKgPerCubicMillimeter: 8.96e-6,
  },
  aluminum: {
    label: '铝线',
    resistivity: 27.57,
    densityKgPerCubicMillimeter: 2.7e-6,
  },
};

export function calculateRoundCoil(input) {
  const { wireDiameter, outerDiameter, innerDiameter, turns } = input;
  const errors = validatePositive(
    input,
    ['wireDiameter', 'outerDiameter', 'innerDiameter', 'turns'],
    ['turns'],
  );
  const material = getMaterial(input.material, errors);
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, result: null };
  }

  const area = PI_CIRCLE * (wireDiameter / 2) ** 2;
  const outerTurnLength = PI_CIRCLE * outerDiameter;
  const innerTurnLength = PI_CIRCLE * innerDiameter;
  const averageTurnLength = (outerTurnLength + innerTurnLength) / 2;
  const length = turns * averageTurnLength;
  const resistance = material.resistivity * length / area / 1e6;
  const coilWeight = area * length * material.densityKgPerCubicMillimeter;

  return {
    valid: true,
    errors: {},
    result: {
      area,
      outerTurnLength,
      innerTurnLength,
      averageTurnLength,
      length,
      resistance,
      coilWeight,
    },
  };
}

export function calculateMotorCoil(input) {
  const {
    wireDiameter,
    outerLength,
    outerWidth,
    innerLength,
    innerWidth,
    turns,
    branchesPerPhase,
    coilsPerBranch,
  } = input;
  const errors = validatePositive(
    input,
    [
      'wireDiameter',
      'outerLength',
      'outerWidth',
      'innerLength',
      'innerWidth',
      'turns',
      'branchesPerPhase',
      'coilsPerBranch',
    ],
    ['turns', 'branchesPerPhase', 'coilsPerBranch'],
  );
  const material = getMaterial(input.material, errors);
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, result: null };
  }

  const area = PI_MOTOR * (wireDiameter / 2) ** 2;
  const outerTurnLength = 2 * (outerLength + outerWidth);
  const innerTurnLength = 2 * (innerLength + innerWidth);
  const averageTurnLength = (outerTurnLength + innerTurnLength) / 2;
  const length = turns * averageTurnLength;
  const coilResistance = material.resistivity * length / area / 1e6;
  const phaseResistance = coilResistance * coilsPerBranch / branchesPerPhase;
  const lineToLineResistance = 2 * phaseResistance;
  const coilWeight = area * length * material.densityKgPerCubicMillimeter;
  const totalWeight = coilWeight * 3 * branchesPerPhase * coilsPerBranch;

  return {
    valid: true,
    errors: {},
    result: {
      area,
      outerTurnLength,
      innerTurnLength,
      averageTurnLength,
      length,
      coilResistance,
      phaseResistance,
      lineToLineResistance,
      coilWeight,
      totalWeight,
    },
  };
}

export function formatLength(value) {
  return Number.isFinite(value) ? value.toFixed(3) : '—';
}

export function formatResistance(value) {
  return Number.isFinite(value) ? value.toFixed(6) : '—';
}

export function formatWeight(value) {
  return Number.isFinite(value) ? value.toFixed(6) : '—';
}

function getMaterial(materialId, errors) {
  if (!Object.hasOwn(COIL_MATERIALS, materialId)) {
    errors.material = '请选择有效材料。';
    return null;
  }
  return COIL_MATERIALS[materialId];
}

function validatePositive(input, fields, integerFields) {
  return fields.reduce((errors, field) => {
    const value = input[field];
    if (!Number.isFinite(value)) {
      errors[field] = '请输入有效数值。';
    } else if (value <= 0) {
      errors[field] = '必须大于 0。';
    } else if (integerFields.includes(field) && !Number.isInteger(value)) {
      errors[field] = '必须为整数。';
    }
    return errors;
  }, {});
}
```

- [ ] **Step 4: 运行纯函数测试并确认通过**

Run:

```bash
node --test tests/coil-resistance.test.mjs
```

Expected: PASS，铜/铝电阻、单线圈重量、三相整机重量、数量倍率和无效材料全部通过。

- [ ] **Step 5: 运行现有非构建测试确认无回归**

Run:

```bash
pnpm test
```

Expected: PASS。

- [ ] **Step 6: 提交纯计算任务**

```bash
git add app/coil-resistance/coil-resistance.js tests/coil-resistance.test.mjs
git commit -m "feat: add coil material and weight calculations"
```

---

### Task 2: 空白表单、材料选择器与重量结果

**Design Reference:** `DESIGN.md` Section 4“输入与选择器/结果面板”、Section 8“Responsive Behavior”。

**Files:**

- Modify: `tests/coil-resistance.test.mjs:1-150`
- Modify: `tests/rendered-html.test.mjs:60-69`
- Modify: `app/coil-resistance/CoilResistanceCalculator.tsx:1-139`
- Modify: `app/coil-resistance/coil-resistance.module.css:11-26`

**Interfaces:**

- Consumes:
  - `COIL_MATERIALS`
  - `calculateRoundCoil`
  - `calculateMotorCoil`
  - `formatLength`
  - `formatResistance`
  - `formatWeight`
- Produces:
  - `round-material` 与 `motor-material` 两个原生选择器。
  - 两组初始空白数值输入。
  - 每组独立 `touched` 状态。
  - 初始提示“请输入线圈参数后显示计算结果。”
  - 圆形“单线圈重量”，矩形“单线圈重量”和“整台三相电机线圈重量”。

- [ ] **Step 1: 先添加页面接线与静态 HTML 失败测试**

在 `tests/coil-resistance.test.mjs` 增加组件源码断言，保证重量结果确实接到页面：

```js
import { readFileSync } from 'node:fs';

const calculatorSource = readFileSync(
  new URL('../app/coil-resistance/CoilResistanceCalculator.tsx', import.meta.url),
  'utf8',
);

test('calculator renders independent material controls and weight results', () => {
  assert.match(calculatorSource, /id="round-material"/);
  assert.match(calculatorSource, /id="motor-material"/);
  assert.match(calculatorSource, /formatWeight\(round\.result\.coilWeight\)/);
  assert.match(calculatorSource, /formatWeight\(motor\.result\.coilWeight\)/);
  assert.match(calculatorSource, /formatWeight\(motor\.result\.totalWeight\)/);
  assert.match(calculatorSource, /整台三相电机线圈重量/);
  assert.match(calculatorSource, /!roundTouched/);
  assert.match(calculatorSource, /!motorTouched/);
  assert.doesNotMatch(calculatorSource, /铜线电阻率/);
});
```

保留当前 `tests/rendered-html.test.mjs` 中“矩形线圈”和删除说明块的断言。把 `0.61`、`0.8` 默认值断言替换为：

```js
assert.match(coilResistance, /id="round-wireDiameter"[^>]*value=""/);
assert.match(coilResistance, /id="motor-wireDiameter"[^>]*value=""/);
assert.match(coilResistance, /<select[^>]*id="round-material"/);
assert.match(coilResistance, /<select[^>]*id="motor-material"/);
assert.equal(
  coilResistance.match(/<option value="copper" selected="">铜线<\/option>/g)?.length,
  2,
);
assert.ok(
  (coilResistance.match(/<option value="aluminum">铝线<\/option>/g)?.length ?? 0) >= 2,
);
assert.ok(
  (coilResistance.match(/请输入线圈参数后显示计算结果。/g)?.length ?? 0) >= 2,
);
assert.doesNotMatch(coilResistance, /铜线电阻率/);
```

- [ ] **Step 2: 运行页面接线测试并确认先失败**

Run:

```bash
node --test tests/coil-resistance.test.mjs
```

Expected: FAIL；当前组件没有材料选择器、重量结果接线或 touched 状态。

- [ ] **Step 3: 构建并确认静态 HTML 测试先失败**

Run:

```bash
pnpm test:build
```

Expected: FAIL；当前 HTML 仍有 `0.61` / `0.8`，且没有材料选择器或待输入提示。

- [ ] **Step 4: 改为空白数值状态并添加材料选择器**

在 `CoilResistanceCalculator.tsx` 导入 `COIL_MATERIALS` 和 `formatWeight`。默认状态、解析函数和材料控件使用：

```tsx
const roundDefaults: FormValues = {
  material: "copper",
  wireDiameter: "",
  outerDiameter: "",
  innerDiameter: "",
  turns: "",
};

const motorDefaults: FormValues = {
  material: "copper",
  wireDiameter: "",
  outerLength: "",
  outerWidth: "",
  innerLength: "",
  innerWidth: "",
  turns: "",
  branchesPerPhase: "",
  coilsPerBranch: "",
};

function parse(values: FormValues) {
  const { material, ...numericValues } = values;
  return {
    material,
    ...Object.fromEntries(
      Object.entries(numericValues).map(([key, value]) => [
        key,
        value.trim() === "" ? Number.NaN : Number(value),
      ]),
    ),
  };
}

function MaterialField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>线圈材料</label>
      <div className={styles.inputWithUnit}>
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
          {Object.entries(COIL_MATERIALS).map(([material, definition]) => (
            <option key={material} value={material}>{definition.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

从 `motorFields` 删除：

```tsx
["resistivity", "铜线电阻率", "μΩ·mm"],
```

在两个 `.fields` 容器的数值字段之前分别渲染：

```tsx
<MaterialField
  id="round-material"
  value={roundValues.material}
  onChange={(value) => update(setRoundValues, setRoundTouched, "material", value)}
/>
```

```tsx
<MaterialField
  id="motor-material"
  value={motorValues.material}
  onChange={(value) => update(setMotorValues, setMotorTouched, "material", value)}
/>
```

- [ ] **Step 5: 添加独立 touched 状态并区分待输入、错误和有效结果**

在组件中增加：

```tsx
const [roundTouched, setRoundTouched] = useState(false);
const [motorTouched, setMotorTouched] = useState(false);

const update = (
  setValues: React.Dispatch<React.SetStateAction<FormValues>>,
  setTouched: React.Dispatch<React.SetStateAction<boolean>>,
  name: string,
  value: string,
) => {
  setTouched(true);
  setValues((current) => ({ ...current, [name]: value }));
};
```

所有数值字段更新调用同时传入对应 `setRoundTouched` 或 `setMotorTouched`。字段错误只在对应计算区已经编辑后传入：

```tsx
error={roundTouched ? round.errors[name] : undefined}
```

```tsx
error={motorTouched ? motor.errors[name] : undefined}
```

两个结果区按以下顺序渲染：

```tsx
{!roundTouched ? (
  <p className={styles.empty}>请输入线圈参数后显示计算结果。</p>
) : round.valid && round.result ? (
  <>
    <ResultRow label="单线圈线材长度" value={formatLength(round.result.length)} unit="mm" />
    <ResultRow label="截面积" value={formatResistance(round.result.area)} unit="mm²" />
    <ResultRow label="单线圈电阻" value={formatResistance(round.result.resistance)} unit="Ω" />
    <ResultRow label="单线圈重量" value={formatWeight(round.result.coilWeight)} unit="kg" />
  </>
) : (
  <p className={styles.invalid}>请修正标记字段后显示计算结果。</p>
)}
```

```tsx
{!motorTouched ? (
  <p className={styles.empty}>请输入线圈参数后显示计算结果。</p>
) : motor.valid && motor.result ? (
  <>
    <ResultRow label="单线圈线材长度" value={formatLength(motor.result.length)} unit="mm" />
    <ResultRow label="截面积" value={formatResistance(motor.result.area)} unit="mm²" />
    <ResultRow label="单线圈电阻" value={formatResistance(motor.result.coilResistance)} unit="Ω" />
    <ResultRow label="单相电阻" value={formatResistance(motor.result.phaseResistance)} unit="Ω" />
    <ResultRow label="P-P 电阻" value={formatResistance(motor.result.lineToLineResistance)} unit="Ω" />
    <ResultRow label="单线圈重量" value={formatWeight(motor.result.coilWeight)} unit="kg" />
    <ResultRow label="整台三相电机线圈重量" value={formatWeight(motor.result.totalWeight)} unit="kg" />
  </>
) : (
  <p className={styles.invalid}>请修正标记字段后显示计算结果。</p>
)}
```

页面说明改为材料中立文案：

```tsx
<p>根据线圈几何尺寸和材料，计算铜线或铝线的电阻与重量。</p>
```

圆形说明：

```tsx
<p>输入材料、尺寸与匝数，计算单线圈线材长度、电阻和重量。</p>
```

矩形说明：

```tsx
<p>按矩形匝长及三相支路关系计算电阻和线圈重量。</p>
```

- [ ] **Step 6: 让原生选择器复用输入视觉并添加中性待输入提示**

在 `coil-resistance.module.css` 把输入样式选择器扩展为：

```css
.inputWithUnit input,
.inputWithUnit select {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  padding: 10px var(--space-3);
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 650;
}

.empty {
  margin: 20px 0 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
```

保留浏览器原生下拉箭头，不引入自定义 SVG 或新色值。现有 `:focus-within`、最小 `44px` 高度和移动端单列规则继续生效。

- [ ] **Step 7: 运行页面接线测试并确认通过**

Run:

```bash
node --test tests/coil-resistance.test.mjs
```

Expected: PASS；计算结果字段和页面重量结果接线一致。

- [ ] **Step 8: 重新构建并验证静态 HTML**

Run:

```bash
pnpm test:build
```

Expected: PASS；两个材料选择器默认铜线，数值输入为空，首次显示待输入提示。

- [ ] **Step 9: 运行页面相关代码检查**

Run:

```bash
pnpm lint
```

Expected: PASS。

- [ ] **Step 10: 提交页面任务**

先用 `git diff --` 确认“矩形线圈”和删除独立说明块的既有改动仍存在。然后提交这些已批准基线和本任务改动：

```bash
git add app/coil-resistance/CoilResistanceCalculator.tsx app/coil-resistance/coil-resistance.module.css tests/coil-resistance.test.mjs tests/rendered-html.test.mjs DESIGN.md
git commit -m "feat: add coil material and weight controls"
```

---

### Task 3: 首页说明、SEO 与项目文档

**Files:**

- Modify: `tests/home.test.mjs:8-30`
- Modify: `tests/seo.test.mjs:10-35`
- Modify: `app/tools.js:18-24`
- Modify: `app/seo.js:54-59`
- Modify: `README.md:7-80`
- Modify: `README.md:111-131`

**Interfaces:**

- Consumes: Task 1 和 Task 2 已实现的材料、电阻、重量行为。
- Produces:
  - 首页工具说明“计算圆形与矩形铜/铝线圈的电阻和重量。”
  - SEO 描述同时包含铜线、铝线、电阻和重量。
  - README 记录材料常量、三相重量公式、空白数值初始状态和新规格链接。

- [ ] **Step 1: 添加首页和 SEO 失败测试**

在 `tests/home.test.mjs` 的工具注册表测试中添加：

```js
const coilTool = TOOL_REGISTRY.find(({ id }) => id === "coil-resistance");
assert.equal(coilTool.description, "计算圆形与矩形铜/铝线圈的电阻和重量。");
```

在 `tests/seo.test.mjs` 的结构化 SEO 测试中添加：

```js
const coilMetadata = seo.createToolMetadata("coil-resistance");
assert.match(coilMetadata.description, /铜线/);
assert.match(coilMetadata.description, /铝线/);
assert.match(coilMetadata.description, /重量/);
assert.ok(coilMetadata.keywords.includes("线圈重量"));
assert.ok(coilMetadata.keywords.includes("铝线电阻"));
```

- [ ] **Step 2: 运行文案测试并确认先失败**

Run:

```bash
node --test tests/home.test.mjs tests/seo.test.mjs
```

Expected: FAIL；当前工具说明和 SEO 仍限定铜线电阻。

- [ ] **Step 3: 更新首页工具说明和线圈电阻 SEO**

在 `app/tools.js` 使用：

```js
description: "计算圆形与矩形铜/铝线圈的电阻和重量。",
```

在 `app/seo.js` 使用：

```js
"coil-resistance": {
  name: "线圈电阻计算器",
  path: "/coil-resistance",
  description: "按材料、裸线径、线圈尺寸和匝数计算铜线或铝线圆形及矩形线圈的电阻与重量。",
  keywords: ["线圈电阻", "线圈重量", "铜线电阻", "铝线电阻", "电机线圈"],
},
```

- [ ] **Step 4: 更新 README 的计算范围与公式**

把工具范围表中的线圈电阻输出改为：

```markdown
| 线圈电阻计算器 | `/coil-resistance` | `线圈电阻计算.xlsx` 扩展 | 线材长度、铜/铝线圈电阻、单线圈与三相整机重量 |
```

把“线圈电阻计算器”章节改为以下内容，保留原圆周率和电阻接法说明：

````markdown
### 线圈电阻计算器

保留 Excel 的圆形与矩形线圈几何、电阻和接法公式，并扩展固定材料选择与重量计算：

- 圆形线圈：根据材料、裸线径、内外圈直径和匝数计算平均匝长、线材长度、单线圈电阻与重量。
- 矩形线圈：根据材料、内外圈长宽、匝数、每相支路数和每支路线圈数计算单线圈、单相及 P-P 电阻，并计算整台三相电机线圈重量。
- 材料只允许铜线和铝线；铜线电阻率为 `17.24 μΩ·mm`、密度为 `8.96 × 10⁻⁶ kg/mm³`，铝线电阻率为 `27.57 μΩ·mm`、密度为 `2.70 × 10⁻⁶ kg/mm³`。
- 页面不预填线径、尺寸、匝数、支路数或线圈数；两个材料选择均默认铜线。

公共公式：

```text
导体截面积 A = π × (d / 2)²
电阻 R = ρ × L / A / 1,000,000
单线圈重量 = A × L × 材料密度
整台三相电机线圈重量 = 单线圈重量 × 3 × 每相支路数 × 每支路线圈数
```
````

把“严格复刻默认值”的说明改为：

```markdown
有效数值输入继续使用工作簿几何与电阻公式；工作簿示例只作为回归测试，不再预填到线圈电阻页面。重量只计算裸导体，不包含漆皮、引出线、跨接线、接头、浸漆或工艺余量。
```

在规格链接处补充：

```markdown
线圈材料与重量扩展见 [docs/superpowers/specs/2026-07-31-coil-material-weight-design.md](docs/superpowers/specs/2026-07-31-coil-material-weight-design.md)。
```

把验证说明中的“工作簿默认值”改为“工作簿示例值”。

- [ ] **Step 5: 运行首页和 SEO 定向测试**

Run:

```bash
node --test tests/home.test.mjs tests/seo.test.mjs
```

Expected: PASS。

- [ ] **Step 6: 运行全部非构建测试**

Run:

```bash
pnpm test
```

Expected: PASS。

- [ ] **Step 7: 运行 lint**

Run:

```bash
pnpm lint
```

Expected: PASS。

- [ ] **Step 8: 运行生产构建**

Run:

```bash
pnpm build
```

Expected: 静态构建成功，四个公开路由仍存在。

- [ ] **Step 9: 验证最终静态 HTML**

Run:

```bash
node --test tests/rendered-html.test.mjs
```

Expected:

- 线圈电阻页数值输入为空、两个材料选择默认铜线。
- 无 `NaN`、`Infinity`、`#DIV/0!` 或 `#REF!` 出现在静态 HTML。

- [ ] **Step 10: 提交公开文案与文档**

```bash
git add app/tools.js app/seo.js tests/home.test.mjs tests/seo.test.mjs README.md
git commit -m "docs: describe copper and aluminum coil weights"
```

---

## 完成条件

- 两个计算区数值输入初始为空，材料默认铜线。
- 铜线和铝线使用规格中的固定电阻率与密度。
- 圆形线圈显示单线圈重量。
- 矩形线圈显示单线圈重量及整台三相电机线圈重量。
- 支路数和每支路线圈数同时正确影响原电阻关系与新增总重量关系。
- 初始空表单不显示错误；编辑后继续使用字段级校验。
- 页面、首页说明、SEO 和 README 使用材料中立文案。
- 当前工作区已有“矩形线圈/删除说明块”修改保留。
- `pnpm test`、`pnpm lint`、`pnpm build` 和静态 HTML 测试全部通过。
