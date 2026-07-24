# Winding Diagram Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current coil-only bus drawing with a scalable iron-core winding diagram, simplify the result table, and apply the approved title treatment.

**Architecture:** Keep `generateWinding` unchanged. Add pure diagram-model and zoom helpers to `app/winding.js`, then render that model in the client-side `WindingDiagram` SVG. Move the diagram to a workspace grid item so `Q >= 12` can span both columns.

**Tech Stack:** React 19, TypeScript, native SVG, native CSS, Node test runner, vinext, Sites.

## Global Constraints

- `Q` slots produce `Q` full teeth, two edge teeth, `Q` coils, and `Q` centered labels.
- A/U is orange, B/V is blue, C/W is green.
- The table keeps only coil, phase, coil mark, polarity, electrical angle, and status.
- The coil mark is the original connection mark's left value only.
- Diagram wheel zoom is pointer-anchored and clamped to 60%-220%.
- `Q >= 12` spans the full workspace; smaller diagrams stay below the result table.
- No new dependencies and no winding-calculation changes.

---

### Task 1: Diagram model and zoom contracts

**Files:**
- Modify: `tests/winding.test.mjs`
- Modify: `app/winding.js`

**Interfaces:**
- Produces: `buildWindingDiagramModel(rows, connections)`
- Produces: `diagramScaleFromWheel(currentScale, deltaY)`
- Produces: `DIAGRAM_MIN_SCALE` and `DIAGRAM_MAX_SCALE`

- [ ] **Step 1: Write failing model and zoom tests**

Add tests asserting a six-row winding produces `toothCount: 6`, `edgeToothCount: 2`, six coils, one `upperMark` label per coil, and phase groups. Add zoom tests asserting wheel-up increases scale, wheel-down decreases scale, and values clamp at `0.6` and `2.2`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/winding.test.mjs`

Expected: FAIL because `buildWindingDiagramModel` and `diagramScaleFromWheel` are not exported.

- [ ] **Step 3: Implement pure helpers**

Keep `buildWindingDiagram` for compatibility. Add:

```js
export const DIAGRAM_MIN_SCALE = 0.6;
export const DIAGRAM_MAX_SCALE = 2.2;

export function diagramScaleFromWheel(currentScale, deltaY) {
  const factor = deltaY < 0 ? 1.1 : 0.9;
  return Math.min(
    DIAGRAM_MAX_SCALE,
    Math.max(DIAGRAM_MIN_SCALE, Math.round(currentScale * factor * 1000) / 1000),
  );
}

export function buildWindingDiagramModel(rows, connections) {
  const coils = rows.map((row) => ({
    ...row,
    label: row.upperMark,
  }));

  return {
    slotCount: rows.length,
    toothCount: rows.length,
    edgeToothCount: 2,
    coils,
    groups: connections.map((connection) => ({
      ...connection,
      coils: coils.filter((coil) => coil.phase === connection.phase),
    })),
  };
}
```

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/winding.test.mjs`

Expected: all winding tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/winding.js tests/winding.test.mjs
git commit -m "Add winding diagram model"
```

### Task 2: Header and compact table

**Files:**
- Modify: `tests/seo.test.mjs`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing winding rows.
- Produces: six-column table and workspace-level `WindingDiagram`.

- [ ] **Step 1: Write failing UI contract tests**

Update source-contract tests to require:

```js
assert.doesNotMatch(page, /className="kicker"/);
assert.doesNotMatch(page, /className="intro"/);
assert.match(page, /<th>线圈标记<\/th>/);
assert.doesNotMatch(page, /<th>上层槽<\/th>/);
assert.doesNotMatch(page, /<th>下层标记<\/th>/);
assert.match(page, /<td>{row\.upperMark}<\/td>/);
assert.match(page, /resetKey={`\$\{slots\}:\$\{poles\}`}/);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/seo.test.mjs`

Expected: FAIL against the old title block, ten-column table, and nested diagram.

- [ ] **Step 3: Implement title and table**

Remove kicker and intro. Keep one `h1`. Render columns:

```tsx
<th>线圈</th>
<th>相别</th>
<th>线圈标记</th>
<th>组极性</th>
<th>线圈电角°</th>
<th>状态</th>
```

Render `row.upperMark` as the single coil mark. Move `WindingDiagram` after the result panel and pass `resetKey={`${slots}:${poles}`}`.

- [ ] **Step 4: Implement table and title styles**

Set the title to bold navy. Set table header, body, phase chips, and status labels to one 14px size. Use balanced fixed columns and centered values.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/seo.test.mjs`

Expected: all SEO and UI contract tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/globals.css tests/seo.test.mjs
git commit -m "Simplify winding results layout"
```

### Task 3: Iron-core SVG, full-width layout, and wheel zoom

**Files:**
- Modify: `tests/seo.test.mjs`
- Modify: `app/WindingDiagram.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `buildWindingDiagramModel`, `diagramScaleFromWheel`, and `resetKey`.
- Produces: interactive SVG with full teeth, two edge teeth, coils, centered labels, serial routes, and pointer-anchored zoom.

- [ ] **Step 1: Write failing diagram source contracts**

Require the component to use `buildWindingDiagramModel`, render `diagram-core-tooth`, `diagram-edge-tooth`, `diagram-coil-label`, use `wheel`, and omit `lowerMark`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/seo.test.mjs`

Expected: FAIL because the old component has no core, zoom handler, or centered single-label contract.

- [ ] **Step 3: Implement diagram geometry**

Use a 96-unit tooth pitch. Render `Q` full teeth and two partial edge teeth. Render one rounded coil per model coil using the phase stroke. Place its only label under the coil center.

- [ ] **Step 4: Implement serial routes**

For each phase group, connect each coil's lower-right point to the next coil's lower-left point using a dedicated orthogonal route lane. Put the phase and first terminal on the left, the second terminal on the right.

- [ ] **Step 5: Implement pointer-anchored wheel zoom**

Attach an element-scoped non-passive wheel handler. Calculate the pointer's content coordinate before scaling, update scale with `diagramScaleFromWheel`, then update `scrollLeft` and `scrollTop` after render so the pointer remains over the same drawing location. Reset to 100% when `resetKey` changes.

- [ ] **Step 6: Implement wide and responsive layout**

Use `grid-column: 1 / -1` for `Q >= 12`, keep `grid-column: 2` otherwise, and collapse to one column under 860px. Keep the viewport height stable and allow internal overflow.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
node --test tests/*.test.mjs
npm run build
```

Expected: all tests pass and vinext build exits 0.

- [ ] **Step 8: Commit**

```bash
git add app/WindingDiagram.tsx app/globals.css tests/seo.test.mjs
git commit -m "Redesign three phase winding diagram"
```

### Task 4: Final validation and Sites release

**Files:**
- Inspect: `.openai/hosting.json`
- Inspect: `dist/`

**Interfaces:**
- Consumes: validated source and existing Sites `project_id`.
- Produces: saved Sites version and deployed URL.

- [ ] **Step 1: Run full verification**

Run:

```bash
node --test tests/*.test.mjs
npm run lint
npm run build
git diff --check
git status --short
```

Expected: zero test failures, zero lint errors, successful build, clean diff check.

- [ ] **Step 2: Package exact build**

Use the Sites packaging helper with the existing `project_id`.

- [ ] **Step 3: Save and deploy**

Push the exact validated commit, save one version, deploy privately, and poll until the deployment reaches `succeeded`.

- [ ] **Step 4: Open deployed site**

Open the successful deployed URL in Codex and return it as the primary deliverable.
