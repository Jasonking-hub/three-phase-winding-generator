import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAGRAM_COIL_STROKE_WIDTH,
  DIAGRAM_COIL_WIDTH,
  DIAGRAM_MAX_SCALE,
  DIAGRAM_MIN_SCALE,
  buildWindingDiagram,
  buildWindingDiagramModel,
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

test("changes diagram scale with the wheel and clamps it to the approved range", () => {
  assert.ok(diagramScaleFromWheel(1, -100) > 1);
  assert.ok(diagramScaleFromWheel(1, 100) < 1);
  assert.equal(diagramScaleFromWheel(DIAGRAM_MAX_SCALE, -100), DIAGRAM_MAX_SCALE);
  assert.equal(diagramScaleFromWheel(DIAGRAM_MIN_SCALE, 100), DIAGRAM_MIN_SCALE);
  assert.equal(DIAGRAM_MIN_SCALE, 0.6);
  assert.equal(DIAGRAM_MAX_SCALE, 2.2);
});
