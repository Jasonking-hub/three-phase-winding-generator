import assert from "node:assert/strict";
import test from "node:test";
import {
  PACKING_MODES,
  calculateCapacity,
  calculateLayerDimensions,
  formatDimension,
  formatInteger,
} from "../app/wire-layout/wire-layout.js";

const wireLayoutModule = await import("../app/wire-layout/wire-layout.js");

const EPSILON = 1e-12;

function near(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${message}: ${actual} !== ${expected}`);
}

test("calculates workbook default layer dimensions with independent literal expectations", () => {
  const calculation = calculateLayerDimensions({
    diameter: 0.87,
    layers: 11,
    roots: 4,
    mode: PACKING_MODES.SAME,
  });

  assert.equal(calculation.valid, true);
  assert.deepEqual(calculation.errors, {});
  assert.equal(calculation.warning, "正常");
  near(calculation.result.verticalPitch, 0.7534421012924616, "Pv");
  near(calculation.result.offset, 0.435, "Offset");
  near(calculation.result.height, 8.404421012924615, "H");
  near(calculation.result.width, 3.915, "W");
  assert.equal(calculation.result.total, 44);
});

test("calculates workbook default capacity with independent literal expectations", () => {
  const calculation = calculateCapacity({
    diameter: 0.62,
    maxWidth: 1.8,
    maxThickness: 3.6,
    mode: PACKING_MODES.SAME,
  });

  assert.equal(calculation.valid, true);
  assert.deepEqual(calculation.errors, {});
  assert.equal(calculation.warning, "正常");
  near(calculation.result.verticalPitch, 0.5369357503463519, "Pv");
  near(calculation.result.offset, 0.31, "Offset");
  assert.equal(calculation.result.layers, 6);
  assert.equal(calculation.result.roots, 2);
  near(calculation.result.height, 3.30467875173176, "H");
  near(calculation.result.width, 1.55, "W");
  near(calculation.result.remainingWidth, 0.25, "remaining width");
  near(calculation.result.remainingThickness, 0.29532124826824013, "remaining thickness");
  assert.equal(calculation.result.total, 12);
});

test("uses mode-specific widths and totals for single and multiple layers", () => {
  const single = calculateLayerDimensions({ diameter: 1, layers: 1, roots: 3, mode: PACKING_MODES.SAME });
  assert.equal(single.result.width, 3);
  assert.equal(single.result.total, 3);

  const boundary = calculateLayerDimensions({ diameter: 1, layers: 4, roots: 3, mode: PACKING_MODES.BOUNDARY });
  assert.equal(boundary.result.width, 3);
  assert.equal(boundary.result.total, 10);
  assert.equal(boundary.warning, "正常");
});

test("preserves exact workbook warnings for incomplete staggered layouts", () => {
  const dimensions = calculateLayerDimensions({ diameter: 1, layers: 2, roots: 1, mode: PACKING_MODES.BOUNDARY });
  assert.equal(dimensions.warning, "注意：水平根数小于 2 时，无法形成完整品字形错排。");

  const boundaryCapacity = calculateCapacity({ diameter: 1, maxWidth: 1, maxThickness: 2, mode: PACKING_MODES.BOUNDARY });
  assert.equal(boundaryCapacity.warning, "注意：水平宽度不足以形成完整品字形错排。");

  const sameCapacity = calculateCapacity({ diameter: 1, maxWidth: 1.49, maxThickness: 2, mode: PACKING_MODES.SAME });
  assert.equal(sameCapacity.warning, "注意：宽度不足以排下两层错位后的最小外包络。");
});

test("returns valid zero capacity for insufficient boundaries without leaking invalid numbers", () => {
  const calculation = calculateCapacity({ diameter: 1, maxWidth: 0.5, maxThickness: 0.5, mode: PACKING_MODES.SAME });
  assert.equal(calculation.valid, true);
  assert.equal(calculation.result.layers, 0);
  assert.equal(calculation.result.roots, 0);
  assert.equal(calculation.result.height, 0);
  assert.equal(calculation.result.width, 0);
  assert.equal(calculation.result.total, 0);
});

test("keeps formula height and SAME offset when layers fit but zero roots fit", () => {
  const calculation = calculateCapacity({ diameter: 1, maxWidth: 0.5, maxThickness: 2, mode: PACKING_MODES.SAME });
  assert.equal(calculation.valid, true);
  assert.equal(calculation.result.layers, 2);
  assert.equal(calculation.result.roots, 0);
  near(calculation.result.height, 1.8660254037844386, "H with zero roots");
  assert.equal(calculation.result.width, 0.5);
  assert.equal(calculation.result.remainingWidth, 0);
  near(calculation.result.remainingThickness, 0.1339745962155614, "remaining thickness with zero roots");
  assert.equal(calculation.result.total, 0);
});

test("rejects finite inputs whose derived dimensions overflow", () => {
  const dimensions = calculateLayerDimensions({
    diameter: Number.MAX_VALUE,
    layers: 2,
    roots: 2,
    mode: PACKING_MODES.SAME,
  });
  assert.equal(dimensions.valid, false);
  assert.equal(dimensions.result, null);
  assert.equal(typeof dimensions.errors.diameter, "string");

  const capacity = calculateCapacity({
    diameter: Number.MIN_VALUE,
    maxWidth: 1,
    maxThickness: 1,
    mode: PACKING_MODES.SAME,
  });
  assert.equal(capacity.valid, false);
  assert.equal(capacity.result, null);
  assert.equal(typeof capacity.errors.diameter, "string");
});

test("builds preview bottom boundary tangent to the final wire row", () => {
  assert.equal(typeof wireLayoutModule.buildPackingPreviewGeometry, "function");
  const preview = wireLayoutModule.buildPackingPreviewGeometry({
    diameter: 1,
    layers: 2,
    roots: 2,
    mode: PACKING_MODES.SAME,
  });
  near(preview.height, 1.8660254037844386, "preview height");
  assert.equal(preview.bottomBoundaryY, preview.height);
  assert.equal(Math.max(...preview.circles.map((circle) => circle.cy + circle.r)), preview.height);
});

test("distinguishes empty required values from invalid numeric values", () => {
  assert.equal(typeof wireLayoutModule.parseRequiredNumber, "function");
  assert.deepEqual(wireLayoutModule.parseRequiredNumber(""), {
    valid: false,
    value: Number.NaN,
    error: "此项为必填。",
  });
  assert.deepEqual(wireLayoutModule.parseRequiredNumber("  "), {
    valid: false,
    value: Number.NaN,
    error: "此项为必填。",
  });
  assert.deepEqual(wireLayoutModule.parseRequiredNumber("1.25"), {
    valid: true,
    value: 1.25,
    error: "",
  });
});

test("rejects non-finite, non-positive, and non-integer layer inputs", () => {
  const dimensions = calculateLayerDimensions({ diameter: Number.NaN, layers: 1.5, roots: 0, mode: "other" });
  assert.equal(dimensions.valid, false);
  assert.equal(dimensions.result, null);
  assert.equal(typeof dimensions.errors.diameter, "string");
  assert.equal(typeof dimensions.errors.layers, "string");
  assert.equal(typeof dimensions.errors.roots, "string");
  assert.equal(typeof dimensions.errors.mode, "string");

  const capacity = calculateCapacity({ diameter: Infinity, maxWidth: "1", maxThickness: -1, mode: PACKING_MODES.SAME });
  assert.equal(capacity.valid, false);
  assert.equal(capacity.result, null);
  assert.equal(typeof capacity.errors.diameter, "string");
  assert.equal(typeof capacity.errors.maxWidth, "string");
  assert.equal(typeof capacity.errors.maxThickness, "string");
});

test("formats dimensions and integers without exposing invalid values", () => {
  assert.equal(formatDimension(1.23456), "1.235");
  assert.equal(formatInteger(12), "12");
  assert.equal(formatDimension(Number.NaN), "—");
  assert.equal(formatInteger(Infinity), "—");
});
