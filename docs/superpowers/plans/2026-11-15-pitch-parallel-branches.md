# 节距与每相并联支路 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans; execute inline in the authorized workspace. Steps use checkbox tracking.

**Goal:** 手动节距与可构造的等效并联支路完整联动。
**Architecture:** `generateWinding` 计算槽对、选项与实际支路；页面与 SVG 共用同一结果，不重复计算接法。
**Tech Stack:** React、JavaScript/TypeScript、SVG、Node test runner；不加依赖。
**Spec:** `docs/superpowers/specs/2026-11-15-pitch-parallel-branches-design.md`

## Global Constraints

- 节距为 1 至 Q−1 的整数；默认12槽10极1节距；默认串联。
- 同匝数、同线径、对称磁场；支路必须含相同电角类别的线圈。
- 旧 API 省略节距时仍使用推荐值；页面显式传入用户节距。
- 保留等尺寸展开图，标注实际槽对及图形宽度不代表节距。

## Review Focus

- 空值、小数、超界节距不能生成；零基波节距给出原因。
- 不对称三相不能提供多支路，并显示提示。
- 改变输入后失效的支路选择回退为1，不能悄悄恢复旧选择。
- 支路不能重复或遗漏线圈，且所有支路组成一致。
- ABC/UVW、BC互换、恢复示例和横向窄屏显示保持同步。

### Task 1: 计算与支路模型

**Files:** `tests/winding.test.mjs`, `app/winding.js`。
**Interfaces:** `generateWinding({ slots, poles, pitch?, parallelBranches?, notation?, swapBC? })` 返回 `pitch, parallelOptions, parallelBranches, balanced, warning, error, rows, connections`；行含 `branch, branchOrder`；连接含 `branches: { branch, coils }[]`。

- [x] 写失败测试：节距及回绕、非法及零基波节距、9/8仅1、12/10可1/2、36/4可1/2/4、失效支路回退、均分覆盖、电角组成、相别切换、不对称三相。
- [x] 运行 `node --test tests/winding.test.mjs`，确认新断言失败。
- [x] 以整数电角分类、公约数及其约数计算选项，按类均分构造支路，保持旧示例结果。
- [x] 重跑计算测试，期望全部通过。

### Task 2: 页面与SVG完整联动

**Files:** `app/slot-pole/page.tsx`, `app/WindingDiagram.tsx`, `app/globals.css`, `tests/seo.test.mjs`, `tests/rendered-html.test.mjs`。
**Interfaces:** 消费 Task 1 的 `pitch, parallelOptions, parallelBranches, rows[].branch/branchOrder, connections[].branches`；展开实际支路分别分配轨道，共用相首端和星点。

- [x] 更新旧六列表格结构测试，增加节距、支路选择、槽对、支路顺序及线路公共节点的断言，确认失败。
- [x] 添加输入与联动；Q/P/y改变时回退串联，恢复示例重置全部；无效输入禁用支路选择。
- [x] SVG展平支路，分别串联，添加同相首端母线与节点，标注槽对与示意图说明。
- [x] 运行完整 `npm test`、`npx tsc --noEmit`、`npm run lint`、`npm run test:build`。
- [x] 浏览器验证多支路、节距、单支路、非法输入及窄屏。

### Task 3: 说明与最终检查

**Files:** `README.md`, `app/seo.js`。

- [x] 更新使用说明及模型假设，确保描述与功能一致。
- [x] 审查diff，复核计算和线路覆盖；记录最终测试及页面检查结果。

## Execution notes

- 用户已明确“可以开始”，在当前工作区直接实施，不再增加计划审批。
- 不自动提交、推送或部署。
