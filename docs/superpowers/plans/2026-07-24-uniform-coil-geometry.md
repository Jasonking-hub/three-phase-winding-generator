# Uniform Coil Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every winding-diagram coil the same size and height, preserve a visible gap between adjacent coil outlines, and remove both edge teeth.

**Architecture:** Put fixed coil geometry and spacing constants in the existing pure `app/winding.js` module so unit tests can verify dimensions and clearance. Consume that geometry from `WindingDiagram.tsx`, deleting span-dependent sizing, phase height offsets, and edge-tooth SVG elements.

**Tech Stack:** React, TypeScript, SVG, native CSS, Node test runner, ESLint, vinext.

## Global Constraints

- Keep `generateWinding` results and all input behavior unchanged.
- Use a tooth pitch of 80 px, coil centerline width of 64 px, and coil stroke width of 10 px.
- Preserve at least 6 px between adjacent visible coil outlines.
- Give every coil the same width, height, and top position.
- Draw exactly `Q` full teeth and `Q` coils, with no edge teeth.
- Keep phase colors, labels, serial routes, wide layout, and wheel zoom unchanged.
- Add no dependencies and do not refactor unrelated code.

---

### Task 1: Fixed and testable coil geometry

**Files:**
- Modify: `tests/winding.test.mjs`
- Modify: `app/winding.js`

**Interfaces:**
- Produces: `fixedCoilGeometry(slotIndex, coreStart)` returning `{ centerX, leftX, rightX, topY, bottomY }`.
- Produces: `DIAGRAM_TOOTH_PITCH`, `DIAGRAM_COIL_WIDTH`, and `DIAGRAM_COIL_STROKE_WIDTH`.
- Changes: `buildWindingDiagramModel` no longer returns `edgeToothCount`.

- [ ] **Step 1: Write the failing geometry test**

```js
test("uses equal coil geometry with a visible gap and no edge teeth", () => {
  const first = fixedCoilGeometry(0, 90);
  const second = fixedCoilGeometry(1, 90);
  assert.equal(first.rightX - first.leftX, DIAGRAM_COIL_WIDTH);
  assert.equal(second.rightX - second.leftX, DIAGRAM_COIL_WIDTH);
  assert.equal(first.topY, second.topY);
  assert.equal(first.bottomY, second.bottomY);
  assert.equal(
    second.leftX - first.rightX - DIAGRAM_COIL_STROKE_WIDTH,
    6,
  );
  assert.equal(
    Object.hasOwn(buildWindingDiagramModel(sampleRows, []).edgeToothCount),
    false,
  );
});
```

- [ ] **Step 2: Run the unit test and verify RED**

Run:

```powershell
& $node --test tests/winding.test.mjs
```

Expected: FAIL because fixed geometry exports do not exist and the model still contains `edgeToothCount`.

- [ ] **Step 3: Add minimal fixed geometry**

```js
export const DIAGRAM_TOOTH_PITCH = 80;
export const DIAGRAM_TOOTH_WIDTH = 46;
export const DIAGRAM_COIL_WIDTH = 64;
export const DIAGRAM_COIL_STROKE_WIDTH = 10;
export const DIAGRAM_COIL_TOP = 66;
export const DIAGRAM_COIL_BOTTOM = 386;

export function fixedCoilGeometry(slotIndex, coreStart) {
  const centerX =
    coreStart + slotIndex * DIAGRAM_TOOTH_PITCH + DIAGRAM_TOOTH_WIDTH / 2;
  return {
    centerX,
    leftX: centerX - DIAGRAM_COIL_WIDTH / 2,
    rightX: centerX + DIAGRAM_COIL_WIDTH / 2,
    topY: DIAGRAM_COIL_TOP,
    bottomY: DIAGRAM_COIL_BOTTOM,
  };
}
```

Delete `edgeToothCount: 2` from `buildWindingDiagramModel`.

- [ ] **Step 4: Run the unit test and verify GREEN**

Run:

```powershell
& $node --test tests/winding.test.mjs
```

Expected: all winding tests pass.

- [ ] **Step 5: Commit**

```powershell
git add app/winding.js tests/winding.test.mjs
git commit -m "Add fixed coil geometry"
```

### Task 2: Render uniform coils without edge teeth

**Files:**
- Modify: `tests/seo.test.mjs`
- Modify: `app/WindingDiagram.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `fixedCoilGeometry`, `DIAGRAM_TOOTH_PITCH`, `DIAGRAM_TOOTH_WIDTH`, and `DIAGRAM_COIL_STROKE_WIDTH`.
- Preserves: existing `WindingDiagram({ winding })` component API.

- [ ] **Step 1: Write the failing render contract test**

```js
assert.match(component, /fixedCoilGeometry/);
assert.doesNotMatch(component, /diagram-edge-tooth/);
assert.doesNotMatch(component, /coilSpan/);
assert.doesNotMatch(component, /phaseOffset/);
assert.doesNotMatch(css, /\.diagram-edge-tooth/);
assert.match(component, /strokeWidth={DIAGRAM_COIL_STROKE_WIDTH}/);
```

- [ ] **Step 2: Run the render test and verify RED**

Run:

```powershell
& $node --test tests/seo.test.mjs
```

Expected: FAIL because the component still renders edge teeth and span-dependent coil geometry.

- [ ] **Step 3: Replace variable geometry with fixed geometry**

```tsx
const coreStart = 90;
const naturalWidth = Math.max(
  820,
  coreStart * 2 + model.slotCount * DIAGRAM_TOOTH_PITCH,
);

const geometryByCoil = useMemo(
  () =>
    new Map(
      model.coils.map((coil, index) => [
        coil.coil,
        fixedCoilGeometry(index, coreStart),
      ]),
    ),
  [model.coils],
);
```

Delete `coilSpan`, the local variable-width `coilGeometry`, both edge-tooth `<rect>` elements, and all edge-tooth CSS. Set each coil rectangle’s `strokeWidth` to `DIAGRAM_COIL_STROKE_WIDTH`. Update the SVG description to mention only `Q` teeth and `Q` coils.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
& $node --test tests/seo.test.mjs tests/winding.test.mjs
```

Expected: all tests pass.

- [ ] **Step 5: Verify visual geometry**

At 12 slots and 100% zoom, confirm:

- 12 full teeth and 12 coils.
- No edge teeth.
- Every coil has identical outer width, height, and top position.
- Adjacent visible coil outlines retain a clear gap.
- Labels, phase colors, serial routes, and wheel zoom still work.

- [ ] **Step 6: Run final checks**

```powershell
& $node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next
& $node node_modules/vinext/dist/cli.js build
git diff --check
```

Expected: zero lint errors, successful production build, and no whitespace errors.

- [ ] **Step 7: Commit**

```powershell
git add app/WindingDiagram.tsx app/globals.css tests/seo.test.mjs
git commit -m "Render uniform winding coils"
```

- [ ] **Step 8: Publish**

Push the exact validated commit to the existing Sites source branch, package the matching build, save one new version, and request explicit approval before replacing the public production deployment.
