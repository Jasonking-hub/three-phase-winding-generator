# Coil Parallel Wires Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; finish with an independent read-only review.

**Goal:** 圆形及矩形电阻支持多根并绕和每相并联支路，重量与Excel一致。
**Architecture:** 现有纯函数内计算，两个表单各自维护输入；导出直接消费同一结果。
**Tech Stack:** React、JavaScript/TypeScript、Node test runner、现有SheetJS。
**Spec:** `docs/superpowers/specs/2026-11-16-coil-parallel-wires-design.md`

## Global Constraints

- 同材质同线径并绕；新增计数默认1；原输入不更改初值。
- 现有材料、圆周率及星形P-P公式保持。
- 不增加依赖、不扩展混线径、温度或接法模型。

## Review Focus

- 根数与支路数同时存在时不能重复除或漏除。
- 总重量须乘根数、三相、支路数、每支路线圈数。
- 长度和面积标签必须区分单根与总量。
- 新参数省略与显式非法值不能混淆。
- 圆形和矩形状态、页面和导出结果须分别一致。

### Task 1: 计算

**Files:** `tests/coil-resistance.test.mjs`, `app/coil-resistance/coil-resistance.js`。
**Interfaces:** 新增输入`parallelWires`；圆形新增`branchesPerPhase/coilsPerBranch`。输出保留旧键，新增`effectiveArea/totalWireLength`及圆形相电阻、P-P与整机重量。

- [x] 增加并运行失败测试：按已知单根样例验证n=2/3/4比例、n/a/c组合及非法计数。
- [x] 实现计算和新增参数校验；省略按1，显式非法值报错。
- [x] 运行`node --test tests/coil-resistance.test.mjs`，确认新旧计算测试通过。

### Task 2: 导出与界面

**Files:** `app/coil-resistance/coil-export.js`, `app/coil-resistance/CoilResistanceCalculator.tsx`, `tests/coil-resistance.test.mjs`, `tests/rendered-html.test.mjs`。
**Interfaces:** 消费Task1的统一结果；Excel与页面标明单根/总量，圆形补齐相电阻及整机重量。

- [x] 更新导出期望及静态HTML输入断言，先确认旧实现失败。
- [x] 修改表单、标签与结果展示，输入说明区分并绕和支路；默认新增参数为1。
- [x] 更新Excel输入/输出行，真实序列化读回验证数值。
- [x] 运行`npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run test:build`。

### Task 3: 浏览器、说明与审查

**Files:** `README.md`, `docs/qa/2026-11-16-coil-parallel-wires.md`。

- [x] 验证两种形状的组合参数、非法值、单根兼容、导出和窄屏。
- [x] 更新README公式，独立审查全部diff，记录验证结果。

## Execution notes

用户已批准完整范围，在当前工作区完成实现与验证；本轮不提交、推送或部署。
