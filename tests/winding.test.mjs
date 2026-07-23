import assert from "node:assert/strict";
import test from "node:test";
import { generateWinding, isValidWinding } from "../app/winding.js";

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
