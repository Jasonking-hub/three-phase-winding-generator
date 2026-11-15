import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAGRAM_COIL_STROKE_WIDTH,
  DIAGRAM_COIL_WIDTH,
  DIAGRAM_MAX_SCALE,
  DIAGRAM_MIN_SCALE,
  buildPhaseRouteLayouts,
  buildSeriesRouteSegments,
  buildWindingDiagram,
  buildWindingDiagramModel,
  coilConnectionEndpoints,
  diagramScaleFromWheel,
  fixedCoilGeometry,
  generateWinding,
  isValidWinding,
} from "../app/winding.js";

test("matches workbook's Q=12, P=10 sample rows", () => {
  const result = generateWinding({ slots: 12, poles: 10, notation: "ABC", swapBC: false });
  assert.equal(result.recommendedPitch, 1);
  assert.equal(result.valid, true);

  assert.deepEqual(
    result.rows.map(({ coil, upperSlot, lowerSlot, displayPhase, upperMark, lowerMark, connection, polarity, electricalAngle }) => ({ coil, upperSlot, lowerSlot, displayPhase, upperMark, lowerMark, connection, polarity, electricalAngle })),
    [
      [1, 1, 2, "A", "A+", "A-", "A+ → A-", "+", 345],
      [2, 2, 3, "C", "C+", "C-", "C+ → C-", "+", 135],
      [3, 3, 4, "C", "C-", "C+", "C- → C+", "-", 285],
      [4, 4, 5, "B", "B-", "B+", "B- → B+", "-", 75],
      [5, 5, 6, "B", "B+", "B-", "B+ → B-", "+", 225],
      [6, 6, 7, "A", "A+", "A-", "A+ → A-", "+", 15],
      [7, 7, 8, "A", "A-", "A+", "A- → A+", "-", 165],
      [8, 8, 9, "C", "C-", "C+", "C- → C+", "-", 315],
      [9, 9, 10, "C", "C+", "C-", "C+ → C-", "+", 105],
      [10, 10, 11, "B", "B+", "B-", "B+ → B-", "+", 255],
      [11, 11, 12, "B", "B-", "B+", "B- → B+", "-", 45],
      [12, 12, 1, "A", "A-", "A+", "A- → A+", "-", 195],
    ].map(([coil, upperSlot, lowerSlot, displayPhase, upperMark, lowerMark, connection, polarity, electricalAngle]) => ({ coil, upperSlot, lowerSlot, displayPhase, upperMark, lowerMark, connection, polarity, electricalAngle })),
  );
});

test("switches phase notation and BC order", () => {
  const result = generateWinding({ slots: 12, poles: 10, notation: "UVW", swapBC: true });
  assert.equal(result.rows[0].displayPhase, "U");
  assert.equal(result.rows[1].displayPhase, "V");
  assert.equal(result.rows[3].displayPhase, "W");
  assert.deepEqual(result.connections.map(({ displayPhase, terminal }) => ({ displayPhase, terminal })), [
    { displayPhase: "U", terminal: "U1 / U2" },
    { displayPhase: "W", terminal: "W1 / W2" },
    { displayPhase: "V", terminal: "V1 / V2" },
  ]);
});

test("uses workbook validation limits", () => {
  assert.equal(isValidWinding(3, 2), true);
  assert.equal(isValidWinding(120, 120), true);
  assert.equal(isValidWinding(11, 10), false);
  assert.equal(isValidWinding(12, 9), false);
  assert.equal(generateWinding({ slots: 12, poles: 9 }).rows.length, 0);
});

test("uses the entered pitch for slot pairs and electrical angles, including wraparound", () => {
  const result = generateWinding({ slots: 12, poles: 10, pitch: 2 });
  assert.equal(result.valid, true);
  assert.equal(result.pitch, 2);
  assert.equal(result.recommendedPitch, 1);
  assert.deepEqual(result.rows.slice(0, 2).map(({ upperSlot, lowerSlot, electricalAngle }) =>
    [upperSlot, lowerSlot, electricalAngle]), [[1, 3, 60], [2, 4, 210]]);
  assert.equal(result.rows[11].lowerSlot, 2);
  assert.equal(generateWinding({ slots: 36, poles: 4 }).pitch, 9);
});

test("rejects invalid and zero-fundamental pitches without producing connections", () => {
  for (const pitch of [0, -1, 12, 1.5, NaN, Infinity, null]) {
    const result = generateWinding({ slots: 12, poles: 10, pitch });
    assert.equal(result.valid, false, `pitch=${pitch}`);
    assert.equal(result.rows.length, 0);
    assert.equal(result.connections.length, 0);
    assert.deepEqual(result.parallelOptions, []);
    assert.ok(result.error);
  }
  const zero = generateWinding({ slots: 12, poles: 4, pitch: 6 });
  assert.equal(zero.valid, false);
  assert.match(zero.error, /基波/);
});

test("offers only constructible equal-composition parallel paths", () => {
  for (const [slots, poles, pitch, options] of [
    [9, 8, 1, [1]],
    [12, 10, 1, [1, 2]],
    [36, 4, 9, [1, 2, 4]],
    [24, 4, 6, [1, 2, 4]],
  ]) {
    const result = generateWinding({ slots, poles, pitch });
    assert.equal(result.balanced, true);
    assert.deepEqual(result.parallelOptions, options, `${slots}/${poles}/${pitch}`);
  }
});

test("warns about asymmetric phases and restricts them to series", () => {
  const result = generateWinding({ slots: 12, poles: 6, pitch: 1, parallelBranches: 2 });
  assert.equal(result.valid, true);
  assert.equal(result.balanced, false);
  assert.match(result.warning, /不对称/);
  assert.deepEqual(result.parallelOptions, [1]);
  assert.equal(result.parallelBranches, 1);
});

test("falls back to series for unavailable branch counts", () => {
  for (const parallelBranches of [3, 0, -1, 1.5, NaN]) {
    const result = generateWinding({ slots: 12, poles: 10, pitch: 1, parallelBranches });
    assert.equal(result.parallelBranches, 1);
    assert.ok(result.rows.every((row) => row.branch === 1));
  }
});

test("partitions all phase coils into equivalent paths without omissions or duplicates", () => {
  const result = generateWinding({ slots: 12, poles: 10, pitch: 1, parallelBranches: 2 });
  assert.equal(result.parallelBranches, 2);
  assert.deepEqual(result.connections[0].branches.map(({ coils }) => coils.map(({ coil }) => coil)),
    [[1, 6], [7, 12]]);
  const allCoils = result.connections.flatMap(({ branches }) => branches.flatMap(({ coils }) => coils));
  assert.deepEqual(allCoils.map(({ coil }) => coil).sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const connection of result.connections) {
    const signatures = connection.branches.map(({ branch, coils }) => {
      assert.equal(coils.length, 2);
      assert.deepEqual(coils.map(({ branchOrder }) => branchOrder), [1, 2]);
      assert.ok(coils.every((coil) => coil.branch === branch));
      return coils.map(({ electricalAngle, polarity }) =>
        (electricalAngle + (polarity === "-" ? 180 : 0)) % 360).sort((a, b) => a - b);
    });
    assert.deepEqual(signatures[0], signatures[1]);
  }
  const model = buildWindingDiagramModel(result.rows, result.connections);
  assert.equal(model.groups[0].branches.length, 2);
  assert.equal(model.groups[0].branches[0].coils[0].label, "A+");
  assert.deepEqual(model.routes.map(({ phase, branch }) => [phase, branch]),
    [["A", 1], ["A", 2], ["B", 1], ["B", 2], ["C", 1], ["C", 2]]);
  const layouts = buildPhaseRouteLayouts(model.routes, 486, 24, 36);
  const geometry = new Map(model.coils.map((coil, index) => [coil.coil, fixedCoilGeometry(index, 90)]));
  for (const [index, route] of model.routes.entries()) {
    const segments = buildSeriesRouteSegments(route.coils, geometry, layouts[index].laneYs, 78, 1200);
    assert.equal(segments.length, 3);
    assert.ok(segments[0].d.startsWith(`M 78 ${layouts[index].startY}`));
    assert.ok(segments.at(-1).d.endsWith("H 1200"));
  }
});

test("phase display changes preserve parallel options and selected paths", () => {
  const result = generateWinding({ slots: 12, poles: 10, pitch: 1, parallelBranches: 2,
    notation: "UVW", swapBC: true });
  assert.deepEqual(result.parallelOptions, [1, 2]);
  assert.equal(result.parallelBranches, 2);
  assert.deepEqual(result.connections.map(({ displayPhase }) => displayPhase), ["U", "W", "V"]);
  assert.ok(result.connections.every(({ branches }) => branches.length === 2));
});

test("groups winding rows for ABC, UVW, and swapped phase diagrams", () => {
  const abc = generateWinding({ slots: 12, poles: 10, notation: "ABC" });
  const abcDiagram = buildWindingDiagram(abc.rows, abc.connections);
  assert.deepEqual(abcDiagram.map(({ displayPhase }) => displayPhase), ["A", "B", "C"]);
  assert.deepEqual(abcDiagram[0].coils[0], {
    coil: 1,
    upperSlot: 1,
    lowerSlot: 2,
    upperMark: "A+",
    lowerMark: "A-",
    polarity: "+",
  });

  const uvw = generateWinding({ slots: 12, poles: 10, notation: "UVW" });
  assert.deepEqual(
    buildWindingDiagram(uvw.rows, uvw.connections).map(({ displayPhase }) => displayPhase),
    ["U", "V", "W"],
  );

  const swapped = generateWinding({ slots: 12, poles: 10, notation: "ABC", swapBC: true });
  const swappedDiagram = buildWindingDiagram(swapped.rows, swapped.connections);
  assert.deepEqual(swappedDiagram.map(({ displayPhase }) => displayPhase), ["A", "C", "B"]);
  assert.equal(swappedDiagram[2].coils[0].upperMark, "B+");
});

test("builds one tooth, coil, and centered label per slot without edge teeth", () => {
  const winding = generateWinding({ slots: 6, poles: 10, notation: "ABC" });
  const model = buildWindingDiagramModel(winding.rows, winding.connections);

  assert.equal(model.slotCount, 6);
  assert.equal(model.toothCount, 6);
  assert.equal(Object.hasOwn(model, "edgeToothCount"), false);
  assert.equal(model.coils.length, 6);
  assert.deepEqual(
    model.coils.map(({ coil, label }) => ({ coil, label })),
    winding.rows.map(({ coil, upperMark }) => ({ coil, label: upperMark })),
  );
  assert.deepEqual(model.groups.map(({ displayPhase }) => displayPhase), ["A", "B", "C"]);
});

test("uses equal coil geometry with a visible gap between adjacent outlines", () => {
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
});

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
    segments.map(({ order, kind, laneY, d }) => ({
      order,
      kind,
      laneY,
      d,
    })),
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

test("changes diagram scale with the wheel and clamps it to the approved range", () => {
  assert.ok(diagramScaleFromWheel(1, -100) > 1);
  assert.ok(diagramScaleFromWheel(1, 100) < 1);
  assert.equal(diagramScaleFromWheel(DIAGRAM_MAX_SCALE, -100), DIAGRAM_MAX_SCALE);
  assert.equal(diagramScaleFromWheel(DIAGRAM_MIN_SCALE, 100), DIAGRAM_MIN_SCALE);
  assert.equal(DIAGRAM_MIN_SCALE, 0.6);
  assert.equal(DIAGRAM_MAX_SCALE, 2.2);
});
