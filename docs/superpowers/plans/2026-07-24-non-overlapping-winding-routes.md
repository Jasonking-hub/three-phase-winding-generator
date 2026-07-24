# Non-Overlapping Winding Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace shared phase route lines with individually tracked, directional, numbered connection lanes that can be followed from U1/V1/W1 to the common star point without overlap.

**Architecture:** Keep winding calculation and coil geometry unchanged. Add pure route-layout helpers in `app/winding.js` that allocate globally unique horizontal lanes and return one SVG path descriptor per connection. `WindingDiagram.tsx` consumes those descriptors, renders phase-colored arrow markers and sequence badges, and derives SVG height and star-point position from route output.

**Tech Stack:** React 19, TypeScript, native SVG, native CSS, Node test runner.

## Global Constraints

- Do not change `generateWinding`, winding row order, polarity calculation, coil count, tooth count, coil geometry, phase colors, zoom range, or star connection semantics.
- Every start lead, inter-coil connection, and star lead owns a unique horizontal `y` coordinate.
- A/U, B/V, and C/W route blocks have disjoint vertical ranges.
- `+` coils remain left-entry/right-exit; `-` coils remain right-entry/left-exit.
- Every route segment has a direction arrow and a unique sequence number.
- Route lane spacing is fixed at `24px`; phase block spacing is fixed at `36px`.
- SVG natural height grows from route content; wheel zoom still scales both width and height without changing the outer viewport height.
- No new dependency, animation, global wheel listener, URL change, or unrelated UI redesign.

---

## File Map

- `app/winding.js`: pure lane allocation, polarity-aware route descriptors, and dynamic route bounds.
- `app/WindingDiagram.tsx`: SVG marker definitions, per-segment paths, order badges, phase labels, dynamic height, and star bus.
- `app/globals.css`: route badge, arrow, and label styling.
- `tests/winding.test.mjs`: exact geometry, lane uniqueness, ordering, and direction tests.
- `tests/seo.test.mjs`: component structure guard for the new route renderer.

### Task 1: Pure Route Lane Allocation

**Files:**
- Modify: `app/winding.js`
- Modify: `tests/winding.test.mjs`

**Interfaces:**
- Consumes: `coilConnectionEndpoints(coil, geometry)` and `Map<coilNumber, CoilGeometry>`.
- Produces: `buildPhaseRouteLayouts(groups, startY, laneGap, phaseGap)` and `buildSeriesRouteSegments(coils, geometryByCoil, laneYs, startX, endX)`.

- [ ] **Step 1: Replace the old route test with failing lane-allocation tests**

Add these imports:

```js
import {
  buildPhaseRouteLayouts,
  buildSeriesRouteSegments,
} from "../app/winding.js";
```

Replace the existing `connects each coil exit...` test with:

```js
test("allocates one globally unique horizontal lane per route segment", () => {
  const layouts = buildPhaseRouteLayouts(
    [
      { phase: "A", coils: [{ coil: 1 }, { coil: 2 }] },
      { phase: "B", coils: [{ coil: 3 }] },
      { phase: "C", coils: [{ coil: 4 }, { coil: 5 }] },
    ],
    100,
    24,
    36,
  );

  assert.deepEqual(layouts.map(({ laneYs }) => laneYs), [
    [100, 124, 148],
    [184, 208],
    [244, 268, 292],
  ]);
  assert.equal(
    new Set(layouts.flatMap(({ laneYs }) => laneYs)).size,
    layouts.flatMap(({ laneYs }) => laneYs).length,
  );
  assert.ok(layouts[1].startY > layouts[0].endY);
  assert.ok(layouts[2].startY > layouts[1].endY);
});

test("builds numbered polarity-aware route segments on distinct lanes", () => {
  const geometry = new Map([
    [1, { leftX: 10, rightX: 20, bottomY: 30 }],
    [2, { leftX: 40, rightX: 50, bottomY: 30 }],
  ]);

  const segments = buildSeriesRouteSegments(
    [
      { coil: 1, polarity: "+" },
      { coil: 2, polarity: "-" },
    ],
    geometry,
    [100, 124, 148],
    0,
    60,
  );

  assert.deepEqual(
    segments.map(({ order, kind, laneY, d }) => ({ order, kind, laneY, d })),
    [
      {
        order: 1,
        kind: "start",
        laneY: 100,
        d: "M 0 100 H 10 V 30",
      },
      {
        order: 2,
        kind: "link",
        laneY: 124,
        d: "M 20 30 V 124 H 50 V 30",
      },
      {
        order: 3,
        kind: "end",
        laneY: 148,
        d: "M 40 30 V 148 H 60",
      },
    ],
  );
  assert.equal(new Set(segments.map(({ laneY }) => laneY)).size, 3);
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
node --test tests/winding.test.mjs
```

Expected: FAIL because `buildPhaseRouteLayouts` and `buildSeriesRouteSegments` are not exported.

- [ ] **Step 3: Implement minimal pure route helpers**

Replace `buildSeriesRoute` in `app/winding.js` with:

```js
export function buildPhaseRouteLayouts(
  groups,
  startY,
  laneGap,
  phaseGap,
) {
  let nextStartY = startY;

  return groups.map((group) => {
    const laneYs = Array.from(
      { length: group.coils.length + 1 },
      (_, index) => nextStartY + index * laneGap,
    );
    const layout = {
      phase: group.phase,
      laneYs,
      startY: laneYs[0],
      endY: laneYs[laneYs.length - 1],
    };
    nextStartY = layout.endY + phaseGap;
    return layout;
  });
}

export function buildSeriesRouteSegments(
  coils,
  geometryByCoil,
  laneYs,
  startX,
  endX,
) {
  if (coils.length === 0 || laneYs.length !== coils.length + 1) return [];

  const firstGeometry = geometryByCoil.get(coils[0].coil);
  const lastGeometry = geometryByCoil.get(coils[coils.length - 1].coil);
  if (!firstGeometry || !lastGeometry) return [];

  const first = coilConnectionEndpoints(coils[0], firstGeometry);
  const segments = [{
    order: 1,
    kind: "start",
    laneY: laneYs[0],
    labelX: startX + 18,
    d: `M ${startX} ${laneYs[0]} H ${first.entryX} V ${firstGeometry.bottomY}`,
  }];

  for (let index = 0; index < coils.length - 1; index += 1) {
    const currentGeometry = geometryByCoil.get(coils[index].coil);
    const nextGeometry = geometryByCoil.get(coils[index + 1].coil);
    if (!currentGeometry || !nextGeometry) return [];

    const current = coilConnectionEndpoints(coils[index], currentGeometry);
    const next = coilConnectionEndpoints(coils[index + 1], nextGeometry);
    const laneY = laneYs[index + 1];
    const direction = next.entryX >= current.exitX ? 1 : -1;
    segments.push({
      order: index + 2,
      kind: "link",
      laneY,
      labelX: current.exitX + direction * 18,
      d: `M ${current.exitX} ${currentGeometry.bottomY} V ${laneY} H ${next.entryX} V ${nextGeometry.bottomY}`,
    });
  }

  const last = coilConnectionEndpoints(coils[coils.length - 1], lastGeometry);
  const endLaneY = laneYs[laneYs.length - 1];
  segments.push({
    order: coils.length + 1,
    kind: "end",
    laneY: endLaneY,
    labelX: endX - 18,
    d: `M ${last.exitX} ${lastGeometry.bottomY} V ${endLaneY} H ${endX}`,
  });
  return segments;
}
```

- [ ] **Step 4: Run focused tests and verify pass**

Run:

```bash
node --test tests/winding.test.mjs
```

Expected: all winding tests PASS.

- [ ] **Step 5: Commit pure routing**

```bash
git add app/winding.js tests/winding.test.mjs
git commit -m "Separate winding route lanes"
```

### Task 2: Directional SVG Rendering and Dynamic Height

**Files:**
- Modify: `app/WindingDiagram.tsx`
- Modify: `app/globals.css`
- Modify: `tests/seo.test.mjs`

**Interfaces:**
- Consumes: `buildPhaseRouteLayouts(...)` and `buildSeriesRouteSegments(...)` from Task 1.
- Produces: per-segment `<path>` nodes with phase-colored marker arrows, `.diagram-route-order` badges, and a content-derived `diagramHeight`.

- [ ] **Step 1: Write failing component structure assertions**

Update the winding diagram test in `tests/seo.test.mjs`:

```js
assert.match(component, /buildPhaseRouteLayouts/);
assert.match(component, /buildSeriesRouteSegments/);
assert.match(component, /<marker/);
assert.match(component, /markerEnd=/);
assert.match(component, /diagram-route-order/);
assert.match(component, /diagramHeight/);
assert.doesNotMatch(component, /buildSeriesRoute\(/);
assert.doesNotMatch(component, /const DIAGRAM_HEIGHT/);
assert.match(css, /\.diagram-route-order-badge/);
assert.match(css, /\.diagram-route-order/);
```

- [ ] **Step 2: Run the structure test and verify failure**

Run:

```bash
node --test tests/seo.test.mjs
```

Expected: FAIL because the component still renders one combined phase path and fixed height.

- [ ] **Step 3: Render route descriptors with unique lanes**

In `app/WindingDiagram.tsx`:

1. Replace the `buildSeriesRoute` import with `buildPhaseRouteLayouts` and `buildSeriesRouteSegments`.
2. Replace `ROUTE_GAP` and `DIAGRAM_HEIGHT` with:

```ts
const ROUTE_LANE_GAP = 24;
const PHASE_ROUTE_GAP = 36;
const ROUTE_BOTTOM_GUTTER = 72;
```

3. Build the layouts and height after `starX`:

```ts
const phaseRouteLayouts = buildPhaseRouteLayouts(
  model.groups,
  ROUTE_START_Y,
  ROUTE_LANE_GAP,
  PHASE_ROUTE_GAP,
);
const starEndYs = phaseRouteLayouts.map(({ endY }) => endY);
const starTopY = Math.min(...starEndYs);
const starBottomY = Math.max(...starEndYs);
const starY = (starTopY + starBottomY) / 2;
const diagramHeight = starBottomY + ROUTE_BOTTOM_GUTTER;
```

4. Use `diagramHeight` in `scaledHeight`, `viewBox`, and inline size.
5. Add one marker per phase before route paths:

```tsx
<defs>
  {model.groups.map((group) => {
    const stroke =
      PHASE_STROKE[group.displayPhase as keyof typeof PHASE_STROKE];
    return (
      <marker
        key={`arrow-${group.phase}`}
        id={`route-arrow-${group.phase}`}
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="4"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path d="M 0 0 L 8 4 L 0 8 Z" fill={stroke} />
      </marker>
    );
  })}
</defs>
```

6. For each phase, get its layout by `groupIndex`, call `buildSeriesRouteSegments`, and render every descriptor:

```tsx
{segments.map((segment) => (
  <g key={`${group.phase}-${segment.order}`}>
    <path
      className="diagram-series-line"
      d={segment.d}
      markerEnd={`url(#route-arrow-${group.phase})`}
    />
    <g
      className="diagram-route-order-badge"
      transform={`translate(${segment.labelX} ${segment.laneY - 9})`}
    >
      <circle r="9" />
      <text className="diagram-route-order" y="4">
        {segment.order}
      </text>
    </g>
  </g>
))}
```

7. Place the phase terminal label at `layout.startY + 5`. Keep the star bus connected only to each phase's final lane.

- [ ] **Step 4: Add restrained route badge styling**

Add to `app/globals.css`:

```css
.diagram-route-order-badge circle {
  fill: #fbfcfe;
  stroke: currentColor;
  stroke-width: 1.5;
}
.diagram-route-order {
  fill: currentColor;
  font-family: ui-monospace, "Cascadia Mono", monospace;
  font-size: 10px;
  font-weight: 800;
  text-anchor: middle;
}
```

- [ ] **Step 5: Run unit, structure, lint, and build checks**

Run:

```bash
node --test tests/winding.test.mjs tests/seo.test.mjs
npm run lint
npm run build
```

Expected: all tests PASS, lint exits 0, build exits 0.

- [ ] **Step 6: Commit SVG rendering**

```bash
git add app/WindingDiagram.tsx app/globals.css tests/seo.test.mjs
git commit -m "Render directional winding route lanes"
```

### Task 3: Browser Geometry Verification and Production Artifact

**Files:**
- Verify: rendered site in the local browser.
- Create through Sites packaging: deployment artifact from the committed source state.

**Interfaces:**
- Consumes: completed Task 1 and Task 2 commits.
- Produces: verified 12-slot ABC and UVW/swapped diagrams, saved Sites version, and user-approved public deployment.

- [ ] **Step 1: Start the local site and open the 12-slot ABC diagram**

Run:

```bash
npm run dev
```

Expected: local site starts without runtime errors.

- [ ] **Step 2: Inspect rendered route geometry**

In browser evaluation, collect every `.diagram-series-line` path and every order badge. Verify:

```js
const paths = [...document.querySelectorAll(".diagram-series-line")];
const badges = [...document.querySelectorAll(".diagram-route-order")];
const horizontalLaneYs = paths.map((path) => {
  const numbers = path.getAttribute("d").match(/-?\d+(?:\.\d+)?/g).map(Number);
  return numbers.length === 6 ? numbers[3] : numbers[1];
});
({
  routeCount: paths.length,
  badgeCount: badges.length,
  uniqueLaneCount: new Set(horizontalLaneYs).size,
  markerCount: paths.filter((path) => path.getAttribute("marker-end")).length,
});
```

Expected for 12-slot three-phase output:

```js
{
  routeCount: 15,
  badgeCount: 15,
  uniqueLaneCount: 15,
  markerCount: 15,
}
```

- [ ] **Step 3: Visually inspect required states**

Check all states:

- ABC, Q=12, P=10: no horizontal segment overlaps another; badges read in order within each phase.
- UVW: U/V/W labels and phase colors remain correct.
- BC swap: group order changes, but route blocks remain disjoint.
- Q=6: six coils remain equal-size, no edge teeth, routes remain readable.
- Wheel zoom: `60%` to `220%`, mouse anchor preserved.
- Star point: all three final arrows terminate at the same vertical star bus.

- [ ] **Step 4: Run final verification from clean source state**

Run:

```bash
git status --short
node --test tests/winding.test.mjs tests/seo.test.mjs
npm run lint
npm run build
```

Expected: clean worktree; tests PASS; lint exits 0; build exits 0.

- [ ] **Step 5: Package and save a Sites version**

Package exact committed source, push it to the existing Sites project from `.openai/hosting.json`, and save a new version. Do not deploy yet.

Expected: saved version reaches terminal success state.

- [ ] **Step 6: Request explicit deployment approval**

Tell the user the saved version is ready and summarize browser evidence. Ask for approval to deploy publicly.

- [ ] **Step 7: Deploy approved version and inspect status**

Deploy only the saved version from Step 5. Inspect deployment until terminal success.

Expected production URL:

```text
https://three-phase-winding-generator.jasonking15871921724.chatgpt.site
```
