import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateMotorCoil,
  calculateRoundCoil,
  formatLength,
  formatResistance,
} from '../app/coil-resistance/coil-resistance.js';

function assertClose(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('calculateRoundCoil matches Excel default resistance', () => {
  const calculation = calculateRoundCoil({
    wireDiameter: 0.61,
    outerDiameter: 71.8,
    innerDiameter: 65.2,
    turns: 228,
  });

  assert.equal(calculation.valid, true);
  assertClose(calculation.result.resistance, 2.8944296694436975);
});

test('calculateRoundCoil returns all Excel intermediates', () => {
  const { result } = calculateRoundCoil({
    wireDiameter: 0.61,
    outerDiameter: 71.8,
    innerDiameter: 65.2,
    turns: 228,
  });

  assertClose(result.area, 0.292246656545325);
  assertClose(result.outerTurnLength, 225.5663524854, 1e-9);
  assertClose(result.innerTurnLength, 204.83184097560002, 1e-9);
  assertClose(result.averageTurnLength, 215.1990967305, 1e-9);
  assertClose(result.length, 49065.394054554, 1e-8);
});

test('calculateMotorCoil matches Excel default values', () => {
  const calculation = calculateMotorCoil({
    wireDiameter: 0.8,
    outerLength: 158,
    outerWidth: 23.5,
    innerLength: 140,
    innerWidth: 5.5,
    turns: 44,
    resistivity: 17.24,
    branchesPerPhase: 1,
    coilsPerBranch: 1,
  });

  assert.equal(calculation.valid, true);
  assertClose(calculation.result.area, 0.50265482456);
  assertClose(calculation.result.outerTurnLength, 363);
  assertClose(calculation.result.innerTurnLength, 291);
  assertClose(calculation.result.averageTurnLength, 327);
  assertClose(calculation.result.length, 14388);
  assertClose(calculation.result.coilResistance, 0.4934780447340384);
  assertClose(calculation.result.phaseResistance, 0.4934780447340384);
  assertClose(calculation.result.lineToLineResistance, 0.9869560894680768);
});

test('calculators reject zero, non-finite, and non-integer count inputs', () => {
  const round = calculateRoundCoil({
    wireDiameter: 0,
    outerDiameter: Infinity,
    innerDiameter: 65.2,
    turns: 2.5,
  });
  const motor = calculateMotorCoil({
    wireDiameter: 0.8,
    outerLength: 158,
    outerWidth: 23.5,
    innerLength: 140,
    innerWidth: 5.5,
    turns: 44.5,
    resistivity: Number.NaN,
    branchesPerPhase: 0,
    coilsPerBranch: 1.5,
  });

  assert.equal(round.valid, false);
  assert.deepEqual(Object.keys(round.errors).sort(), ['outerDiameter', 'turns', 'wireDiameter']);
  assert.equal(round.result, null);
  assert.equal(motor.valid, false);
  assert.deepEqual(Object.keys(motor.errors).sort(), ['branchesPerPhase', 'coilsPerBranch', 'resistivity', 'turns']);
  assert.equal(motor.result, null);
});

test('round calculation preserves Excel average formula when outer is below inner', () => {
  const lowerOuter = calculateRoundCoil({
    wireDiameter: 1,
    outerDiameter: 10,
    innerDiameter: 20,
    turns: 1,
  });

  assert.equal(lowerOuter.valid, true);
  assertClose(lowerOuter.result.averageTurnLength, 47.123889795);
});

test('formatters use required precision and hide invalid values', () => {
  assert.equal(formatLength(12), '12.000');
  assert.equal(formatResistance(12), '12.000000');
  assert.equal(formatLength(Number.NaN), '—');
  assert.equal(formatResistance(Infinity), '—');
});
