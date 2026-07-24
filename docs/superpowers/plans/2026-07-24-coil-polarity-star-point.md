# Coil Polarity and Star Point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw positive and negative coils with opposite electrical entry/exit directions and join all three phase ends at one visible Y-connection star point.

**Architecture:** Move polarity-aware endpoint and series-route construction into the existing pure `app/winding.js` module so direction can be verified without a browser. Keep SVG layout in `WindingDiagram.tsx`, replacing three independent phase-end labels with one shared neutral bus and star-point node.

**Tech Stack:** React, TypeScript, SVG, native CSS, Node test runner, ESLint, vinext.

## Global Constraints

- `+` coils use left entry and right exit.
- `-` coils use right entry and left exit.
- Every series segment connects the previous coil exit to the next coil entry.
- A/B/C and U/V/W use the same polarity rule.
- `U1`, `V1`, and `W1` remain the three independent phase starts.
- `U2`, `V2`, and `W2` converge at one visible `星点 N`.
- Preserve coil dimensions, 6 px adjacent outline gaps, labels, phase colors, wide layout, and wheel zoom.
- Add no dependencies and do not alter winding calculations.

---

### Task 1: Polarity-aware series route

**Files:**
- Modify: `tests/winding.test.mjs`
- Modify: `app/winding.js`
- Modify: `app/WindingDiagram.tsx`

**Interfaces:**
- Produces: `coilConnectionEndpoints(coil, geometry)` returning `{ entryX, exitX }`.
- Produces: `buildSeriesRoute(coils, geometryByCoil, routeY, startX, endX)` returning one SVG path string.
- Consumes: existing coil objects with `coil` and `polarity`, plus geometry objects with `leftX`, `rightX`, and `bottomY`.

- [ ] **Step 1: Write failing direction tests**

```js
test("reverses coil entry and exit for negative polarity", () => {
  const geometry = { leftX: 10, rightX: 20, bottomY: 30 };
  assert.deepEqual(
    coilConnectionEndpoints({ polarity: "+" }, geometry),
    { entryX: 10, exitX: 20 },
  );
  assert.deepEqual(
    coilConnectionEndpoints({ polarity: "-" }, geometry),
    { entryX: 20, exitX: 10 },
  );
});

test("connects each coil exit to the next polarity-aware entry", () => {
  const geometry = new Map([
    [1, { leftX: 10, rightX: 20, bottomY: 30 }],
    [2, { leftX: 40, rightX: 50, bottomY: 30 }],
  ]);
  const route = buildSeriesRoute(
    [{ coil: 1, polarity: "+" }, { coil: 2, polarity: "-" }],
    geometry,
    100,
    0,
    60,
  );
  assert.equal(
    route,
    "M 0 100 H 10 V 30 M 20 30 V 100 H 50 V 30 M 40 30 V 100 H 60",
  );
});
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
& $node --test tests/winding.test.mjs
```

Expected: FAIL because both polarity-aware route exports are missing.

- [ ] **Step 3: Implement the pure route functions**

```js
export function coilConnectionEndpoints(coil, geometry) {
  return coil.polarity === "-"
    ? { entryX: geometry.rightX, exitX: geometry.leftX }
    : { entryX: geometry.leftX, exitX: geometry.rightX };
}

export function buildSeriesRoute(
  coils,
  geometryByCoil,
  routeY,
  startX,
  endX,
) {
  if (coils.length === 0) return "";
  const firstGeometry = geometryByCoil.get(coils[0].coil);
  const lastGeometry = geometryByCoil.get(coils[coils.length - 1].coil);
  if (!firstGeometry || !lastGeometry) return "";

  const first = coilConnectionEndpoints(coils[0], firstGeometry);
  const sections = [
    `M ${startX} ${routeY} H ${first.entryX} V ${firstGeometry.bottomY}`,
  ];

  for (let index = 0; index < coils.length - 1; index += 1) {
    const currentGeometry = geometryByCoil.get(coils[index].coil);
    const nextGeometry = geometryByCoil.get(coils[index + 1].coil);
    if (!currentGeometry || !nextGeometry) continue;
    const current = coilConnectionEndpoints(coils[index], currentGeometry);
    const next = coilConnectionEndpoints(coils[index + 1], nextGeometry);
    sections.push(
      `M ${current.exitX} ${currentGeometry.bottomY} V ${routeY} H ${next.entryX} V ${nextGeometry.bottomY}`,
    );
  }

  const last = coilConnectionEndpoints(
    coils[coils.length - 1],
    lastGeometry,
  );
  sections.push(
    `M ${last.exitX} ${lastGeometry.bottomY} V ${routeY} H ${endX}`,
  );
  return sections.join(" ");
}
```

Delete the old component-local `serialRoute` and import `buildSeriesRoute`.

- [ ] **Step 4: Run tests and verify GREEN**

```powershell
& $node --test tests/winding.test.mjs
```

Expected: all winding tests pass.

- [ ] **Step 5: Commit**

```powershell
git add app/winding.js app/WindingDiagram.tsx tests/winding.test.mjs
git commit -m "Respect coil polarity in series routes"
```

### Task 2: Shared Y-connection star point

**Files:**
- Modify: `tests/seo.test.mjs`
- Modify: `app/WindingDiagram.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `buildSeriesRoute`.
- Preserves: existing `WindingDiagram({ winding })` component API.

- [ ] **Step 1: Write failing star-point render test**

```js
assert.match(component, /diagram-star-bus/);
assert.match(component, /diagram-star-node/);
assert.match(component, /星点 N/);
assert.match(component, /U2 \/ V2 \/ W2/);
assert.doesNotMatch(component, /endTerminal/);
assert.match(component, /buildSeriesRoute/);
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
& $node --test tests/seo.test.mjs
```

Expected: FAIL because the diagram still renders three independent end terminals.

- [ ] **Step 3: Render one common star point**

```tsx
const starX = naturalWidth - 112;
const starTopY = ROUTE_START_Y;
const starBottomY = ROUTE_START_Y + (model.groups.length - 1) * ROUTE_GAP;
const starY = (starTopY + starBottomY) / 2;
```

End every phase route at `starX`. After the phase-route groups, render:

```tsx
<g className="diagram-star-point">
  <path
    className="diagram-star-bus"
    d={`M ${starX} ${starTopY} V ${starBottomY}`}
  />
  <circle className="diagram-star-node" cx={starX} cy={starY} r="5" />
  <text className="diagram-star-label" x={starX + 14} y={starY - 5}>
    星点 N
  </text>
  <text className="diagram-star-terminals" x={starX + 14} y={starY + 15}>
    U2 / V2 / W2
  </text>
</g>
```

Remove the per-phase right-side terminal text. Add a right-side SVG gutter so the star label fits without overlapping the final coil.

- [ ] **Step 4: Add restrained star-point styling**

```css
.diagram-star-bus {
  fill: none;
  stroke: #35465c;
  stroke-width: 2;
}
.diagram-star-node { fill: #35465c; }
.diagram-star-label,
.diagram-star-terminals {
  fill: #35465c;
  font-size: 13px;
  font-weight: 800;
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

```powershell
& $node --test tests/seo.test.mjs tests/winding.test.mjs
```

Expected: all tests pass.

- [ ] **Step 6: Browser verification**

At 12 slots, trace A, B, and C from `U1`, `V1`, and `W1`:

- Every `+` coil is entered on the left and exited on the right.
- Every `-` coil is entered on the right and exited on the left.
- All three final exits reach one common vertical bus.
- The bus has one visible filled node and `星点 N（U2/V2/W2）` labeling.
- No coil, label, or route overlaps the star-point label.

- [ ] **Step 7: Final verification**

```powershell
& $node --test tests/seo.test.mjs tests/winding.test.mjs
& $node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next
& $node node_modules/vinext/dist/cli.js build
git diff --check
```

Expected: zero test failures, zero lint errors, successful build, and no whitespace errors.

- [ ] **Step 8: Commit and publish**

```powershell
git add app/WindingDiagram.tsx app/globals.css tests/seo.test.mjs
git commit -m "Add shared winding star point"
```

Push the exact validated commit to the existing Sites source branch, save one new version, and ask for explicit approval before replacing the public deployment.
