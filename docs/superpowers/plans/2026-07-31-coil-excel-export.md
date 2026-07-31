# Coil Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent browser-downloaded `.xlsx` exports for valid round and rectangular coil calculations.

**Architecture:** A pure export-model module maps validated inputs and existing calculation results to numeric spreadsheet rows. A focused workbook module uses SheetJS to create one-sheet workbooks and trigger browser downloads; the calculator dynamically imports that module only after an export click.

**Tech Stack:** React 19, Vinext/Vite, JavaScript/TypeScript, Node test runner, SheetJS Community Edition 0.20.3.

## Global Constraints

- Export current values only; do not write Excel formulas.
- Round and rectangular calculators export independently.
- Invalid or incomplete calculations cannot be exported.
- Each workbook contains one sheet and the columns `项目 / 数值 / 单位`.
- All inputs, material constants, intermediate calculations, and displayed results listed in the approved spec must be included.
- Numeric spreadsheet values remain numbers.
- SheetJS must be loaded only after the user clicks an export button.
- Browser download filenames must use `圆形线圈计算结果_YYYYMMDD-HHmmss.xlsx` or `矩形线圈计算结果_YYYYMMDD-HHmmss.xlsx`.
- Keep existing calculation formulas unchanged.

---

### Task 1: Export rows and XLSX workbook

**Files:**
- Create: `app/coil-resistance/coil-export.js`
- Create: `app/coil-resistance/coil-workbook.js`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Test: `tests/coil-resistance.test.mjs`

**Interfaces:**
- Consumes: `COIL_MATERIALS`, validated parsed inputs, and results returned by `calculateRoundCoil` / `calculateMotorCoil`.
- Produces:
  - `buildRoundExportRows(input, result): Array<[string, string | number, string]>`
  - `buildMotorExportRows(input, result): Array<[string, string | number, string]>`
  - `buildExportFilename(label, date?): string`
  - `createCoilWorkbook(sheetName, rows): SheetJS.WorkBook`
  - `downloadCoilWorkbook(sheetName, rows, filename): void`

- [ ] **Step 1: Add the official SheetJS package**

Run:

```powershell
pnpm add xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Expected: `package.json` and `pnpm-lock.yaml` record SheetJS 0.20.3.

- [ ] **Step 2: Write failing export-model and workbook tests**

Add imports:

```js
import * as XLSX from 'xlsx';
import {
  buildExportFilename,
  buildMotorExportRows,
  buildRoundExportRows,
} from '../app/coil-resistance/coil-export.js';
import { createCoilWorkbook } from '../app/coil-resistance/coil-workbook.js';
```

Add tests that:

```js
test('round export includes every input, material constant, and result as typed rows', () => {
  const calculation = calculateRoundCoil(ROUND_SAMPLE);
  const rows = buildRoundExportRows(ROUND_SAMPLE, calculation.result);

  assert.deepEqual(rows, [
    ['项目', '数值', '单位'],
    ['线圈材料', '铜线', ''],
    ['电阻率', 17.24, 'μΩ·mm'],
    ['密度', 8.96e-6, 'kg/mm³'],
    ['裸线径 d', 0.61, 'mm'],
    ['最外圈直径', 71.8, 'mm'],
    ['最内圈直径', 65.2, 'mm'],
    ['匝数', 228, '匝'],
    ['截面积', calculation.result.area, 'mm²'],
    ['最外圈单匝长度', calculation.result.outerTurnLength, 'mm'],
    ['最内圈单匝长度', calculation.result.innerTurnLength, 'mm'],
    ['平均单匝长度', calculation.result.averageTurnLength, 'mm'],
    ['单线圈线材长度', calculation.result.length, 'mm'],
    ['单线圈电阻', calculation.result.resistance, 'Ω'],
    ['单线圈重量', calculation.result.coilWeight, 'kg'],
  ]);
});

test('motor export includes branch counts and all resistance and weight results', () => {
  const calculation = calculateMotorCoil(MOTOR_SAMPLE);
  const rows = buildMotorExportRows(MOTOR_SAMPLE, calculation.result);

  assert.equal(rows[0][0], '项目');
  assert.deepEqual(rows.find(([label]) => label === '每相支路数'), ['每相支路数', 1, '支路']);
  assert.deepEqual(rows.find(([label]) => label === '每支路线圈数'), ['每支路线圈数', 1, '线圈']);
  assert.deepEqual(rows.find(([label]) => label === '整台三相电机线圈重量'), [
    '整台三相电机线圈重量',
    calculation.result.totalWeight,
    'kg',
  ]);
  assert.equal(rows.length, 22);
});

test('export filename uses a stable local timestamp', () => {
  const date = new Date(2026, 6, 31, 10, 30, 0);
  assert.equal(buildExportFilename('圆形线圈', date), '圆形线圈计算结果_20260731-103000.xlsx');
});

test('workbook preserves row values and spreadsheet column widths', () => {
  const rows = buildRoundExportRows(ROUND_SAMPLE, calculateRoundCoil(ROUND_SAMPLE).result);
  const workbook = createCoilWorkbook('圆形线圈', rows);
  const sheet = workbook.Sheets['圆形线圈'];

  assert.deepEqual(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }), rows);
  assert.deepEqual(sheet['!cols'], [{ wch: 28 }, { wch: 20 }, { wch: 14 }]);
});
```

- [ ] **Step 3: Run the tests and verify RED**

Run:

```powershell
node --test tests/coil-resistance.test.mjs
```

Expected: FAIL because `coil-export.js` and `coil-workbook.js` do not exist.

- [ ] **Step 4: Implement the minimal export model**

Create `coil-export.js` with:

```js
import { COIL_MATERIALS } from './coil-resistance.js';

const HEADER = [['项目', '数值', '单位']];

function materialRows(input) {
  const material = COIL_MATERIALS[input.material];
  return [
    ['线圈材料', material.label, ''],
    ['电阻率', material.resistivity, 'μΩ·mm'],
    ['密度', material.densityKgPerCubicMillimeter, 'kg/mm³'],
  ];
}

export function buildRoundExportRows(input, result) {
  return [
    ...HEADER,
    ...materialRows(input),
    ['裸线径 d', input.wireDiameter, 'mm'],
    ['最外圈直径', input.outerDiameter, 'mm'],
    ['最内圈直径', input.innerDiameter, 'mm'],
    ['匝数', input.turns, '匝'],
    ['截面积', result.area, 'mm²'],
    ['最外圈单匝长度', result.outerTurnLength, 'mm'],
    ['最内圈单匝长度', result.innerTurnLength, 'mm'],
    ['平均单匝长度', result.averageTurnLength, 'mm'],
    ['单线圈线材长度', result.length, 'mm'],
    ['单线圈电阻', result.resistance, 'Ω'],
    ['单线圈重量', result.coilWeight, 'kg'],
  ];
}

export function buildMotorExportRows(input, result) {
  return [
    ...HEADER,
    ...materialRows(input),
    ['裸线径 d', input.wireDiameter, 'mm'],
    ['最外圈长', input.outerLength, 'mm'],
    ['最外圈宽', input.outerWidth, 'mm'],
    ['最内圈长', input.innerLength, 'mm'],
    ['最内圈宽', input.innerWidth, 'mm'],
    ['匝数', input.turns, '匝'],
    ['每相支路数', input.branchesPerPhase, '支路'],
    ['每支路线圈数', input.coilsPerBranch, '线圈'],
    ['截面积', result.area, 'mm²'],
    ['最外圈单匝长度', result.outerTurnLength, 'mm'],
    ['最内圈单匝长度', result.innerTurnLength, 'mm'],
    ['平均单匝长度', result.averageTurnLength, 'mm'],
    ['单线圈线材长度', result.length, 'mm'],
    ['单线圈电阻', result.coilResistance, 'Ω'],
    ['单相电阻', result.phaseResistance, 'Ω'],
    ['P-P 电阻', result.lineToLineResistance, 'Ω'],
    ['单线圈重量', result.coilWeight, 'kg'],
    ['整台三相电机线圈重量', result.totalWeight, 'kg'],
  ];
}

export function buildExportFilename(label, date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${label}计算结果_${stamp}.xlsx`;
}
```

- [ ] **Step 5: Implement workbook generation and browser download**

Create `coil-workbook.js`:

```js
import * as XLSX from 'xlsx';

export function createCoilWorkbook(sheetName, rows) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return workbook;
}

export function downloadCoilWorkbook(sheetName, rows, filename) {
  XLSX.writeFileXLSX(createCoilWorkbook(sheetName, rows), filename, { compression: true });
}
```

- [ ] **Step 6: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/coil-resistance.test.mjs
```

Expected: all coil-resistance tests PASS.

- [ ] **Step 7: Commit Task 1**

```powershell
git add package.json pnpm-lock.yaml app/coil-resistance/coil-export.js app/coil-resistance/coil-workbook.js tests/coil-resistance.test.mjs
git commit -m "feat: build coil Excel workbooks"
```

### Task 2: Export controls and browser wiring

**Files:**
- Modify: `app/coil-resistance/CoilResistanceCalculator.tsx`
- Modify: `app/coil-resistance/coil-resistance.module.css`
- Test: `tests/coil-resistance.test.mjs`

**Interfaces:**
- Consumes: `buildRoundExportRows`, `buildMotorExportRows`, `buildExportFilename`, and dynamically imported `downloadCoilWorkbook`.
- Produces: two accessible export buttons, disabled-state behavior, automatic downloads, and isolated error messages.

- [ ] **Step 1: Write failing UI wiring tests**

Add source assertions:

```js
test('calculator exposes independent lazy Excel exports for valid results', () => {
  assert.match(calculatorSource, /await import\("\.\/coil-workbook\.js"\)/);
  assert.match(calculatorSource, /downloadCoilWorkbook\("圆形线圈", buildRoundExportRows/);
  assert.match(calculatorSource, /downloadCoilWorkbook\("矩形线圈", buildMotorExportRows/);
  assert.match(calculatorSource, /disabled=\{!round\.valid\}/);
  assert.match(calculatorSource, /disabled=\{!motor\.valid\}/);
  assert.equal((calculatorSource.match(/导出 Excel/g) ?? []).length, 2);
});

test('calculator keeps export failures isolated from calculation results', () => {
  assert.match(calculatorSource, /Excel 导出失败，请重试。/);
  assert.match(calculatorSource, /roundExportError/);
  assert.match(calculatorSource, /motorExportError/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/coil-resistance.test.mjs
```

Expected: FAIL because export buttons and dynamic workbook import are absent.

- [ ] **Step 3: Add independent export handlers**

Modify `CoilResistanceCalculator.tsx`:

```tsx
import {
  buildExportFilename,
  buildMotorExportRows,
  buildRoundExportRows,
} from "./coil-export.js";

const [roundExportError, setRoundExportError] = useState("");
const [motorExportError, setMotorExportError] = useState("");

const exportRound = async () => {
  if (!round.valid || !round.result) return;
  setRoundExportError("");
  try {
    const { downloadCoilWorkbook } = await import("./coil-workbook.js");
    downloadCoilWorkbook(
      "圆形线圈",
      buildRoundExportRows(parse(roundValues), round.result),
      buildExportFilename("圆形线圈"),
    );
  } catch {
    setRoundExportError("Excel 导出失败，请重试。");
  }
};

const exportMotor = async () => {
  if (!motor.valid || !motor.result) return;
  setMotorExportError("");
  try {
    const { downloadCoilWorkbook } = await import("./coil-workbook.js");
    downloadCoilWorkbook(
      "矩形线圈",
      buildMotorExportRows(parse(motorValues), motor.result),
      buildExportFilename("矩形线圈"),
    );
  } catch {
    setMotorExportError("Excel 导出失败，请重试。");
  }
};
```

Wrap each result title with:

```tsx
<div className={styles.resultHeader}>
  <h2>计算结果</h2>
  <button className={styles.exportButton} type="button" onClick={exportRound} disabled={!round.valid}>
    导出 Excel
  </button>
</div>
{roundExportError && <p className={styles.exportError} role="alert">{roundExportError}</p>}
```

Use `exportMotor`, `motor.valid`, and `motorExportError` in the rectangular result panel.

- [ ] **Step 4: Style the controls**

Add focused styles:

```css
.resultHeader { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.exportButton { min-height: 40px; border: 1px solid var(--color-brand); border-radius: var(--radius-md); background: var(--color-surface); padding: 8px 14px; color: var(--color-brand); cursor: pointer; font-weight: 700; }
.exportButton:hover:not(:disabled) { background: color-mix(in srgb, var(--color-brand) 8%, var(--color-surface)); }
.exportButton:focus-visible { outline: 2px solid var(--color-brand); outline-offset: 2px; }
.exportButton:disabled { cursor: not-allowed; opacity: .45; }
.exportError { margin: var(--space-3) 0 0; color: var(--color-error); font-size: 14px; }
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/coil-resistance.test.mjs
```

Expected: all coil-resistance tests PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add app/coil-resistance/CoilResistanceCalculator.tsx app/coil-resistance/coil-resistance.module.css tests/coil-resistance.test.mjs
git commit -m "feat: export coil calculations to Excel"
```

### Task 3: Full verification, merge, and production deployment

**Files:**
- Verify all modified files.
- No new production behavior.

**Interfaces:**
- Consumes: completed feature branch and `dist/client`.
- Produces: green merged `main` and a ready Netlify production deploy.

- [ ] **Step 1: Run feature-branch verification**

```powershell
$env:CI='true'
pnpm test
pnpm lint
pnpm build
node --test tests/rendered-html.test.mjs
```

Expected: all tests PASS, ESLint exits 0, build prerenders all routes, static export tests PASS.

- [ ] **Step 2: Review the diff against the approved spec**

```powershell
git diff main...HEAD --check
git diff main...HEAD --stat
git status --short
```

Expected: only scoped export files, dependency metadata, tests, and approved docs differ; worktree is clean.

- [ ] **Step 3: Merge locally to main**

```powershell
git checkout main
git pull --ff-only
git merge codex/coil-excel-export
```

Expected: clean merge into `main`.

- [ ] **Step 4: Verify the merged tree**

```powershell
$env:CI='true'
pnpm test
pnpm lint
pnpm build
node --test tests/rendered-html.test.mjs
```

Expected: same green result on `main`.

- [ ] **Step 5: Deploy the verified static export**

```powershell
npx --yes netlify-cli status
npx --yes netlify-cli deploy --prod --dir=dist/client --no-build --message "Add coil Excel exports" --json
```

Expected: site `zx-toolbox`, production deployment returns a deploy ID and URL.

- [ ] **Step 6: Verify Netlify and production assets**

- Netlify deploy state must be `ready`.
- `https://zx-toolbox.netlify.app/coil-resistance` must return HTTP 200.
- The deployed calculator asset must contain both `导出 Excel` controls and the lazy workbook chunk.
- Trigger one valid round export and one valid rectangular export in a browser; each download must have an `.xlsx` filename and open as a one-sheet workbook containing the required rows.

- [ ] **Step 7: Clean up the merged feature branch**

```powershell
git branch -d codex/coil-excel-export
```

Expected: branch deletion succeeds because all commits are merged.
