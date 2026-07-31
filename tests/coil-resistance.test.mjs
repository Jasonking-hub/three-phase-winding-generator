import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as XLSX from 'xlsx';

import {
  calculateMotorCoil,
  calculateRoundCoil,
  formatLength,
  formatResistance,
  formatWeight,
} from '../app/coil-resistance/coil-resistance.js';
import {
  buildExportFilename,
  buildMotorExportRows,
  buildRoundExportRows,
  exportCoilCalculation,
  isExportableCoilCalculation,
} from '../app/coil-resistance/coil-export.js';
import { createCoilWorkbook } from '../app/coil-resistance/coil-workbook.js';

const calculatorSource = readFileSync(
  new URL('../app/coil-resistance/CoilResistanceCalculator.tsx', import.meta.url),
  'utf8',
);

function assertClose(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
}

const ROUND_SAMPLE = {
  material: 'copper',
  wireDiameter: 0.61,
  outerDiameter: 71.8,
  innerDiameter: 65.2,
  turns: 228,
};

const MOTOR_SAMPLE = {
  material: 'copper',
  wireDiameter: 0.8,
  outerLength: 158,
  outerWidth: 23.5,
  innerLength: 140,
  innerWidth: 5.5,
  turns: 44,
  branchesPerPhase: 1,
  coilsPerBranch: 1,
};

test('round export includes every input, material constant, and result as typed rows', () => {
  const calculation = calculateRoundCoil(ROUND_SAMPLE);
  const rows = buildRoundExportRows(ROUND_SAMPLE, calculation.result);

  assert.deepEqual(rows, [
    ['项目', '数值', '单位'],
    ['线圈材料', '铜线', ''],
    ['电阻率', 17.24, 'μΩ·mm'],
    ['密度', 8.96e-6, 'kg/mm³'],
    ['裸线径 d', 0.61, 'mm'],
    ['最外圈直径', 71.8, 'mm'],
    ['最内圈直径', 65.2, 'mm'],
    ['匝数', 228, '匝'],
    ['截面积', calculation.result.area, 'mm²'],
    ['最外圈单匝长度', calculation.result.outerTurnLength, 'mm'],
    ['最内圈单匝长度', calculation.result.innerTurnLength, 'mm'],
    ['平均单匝长度', calculation.result.averageTurnLength, 'mm'],
    ['单线圈线材长度', calculation.result.length, 'mm'],
    ['单线圈电阻', calculation.result.resistance, 'Ω'],
    ['单线圈重量', calculation.result.coilWeight, 'kg'],
  ]);
});

test('motor export includes every input, material constant, and result as typed rows', () => {
  const calculation = calculateMotorCoil(MOTOR_SAMPLE);
  const rows = buildMotorExportRows(MOTOR_SAMPLE, calculation.result);

  assert.deepEqual(rows, [
    ['项目', '数值', '单位'],
    ['线圈材料', '铜线', ''],
    ['电阻率', 17.24, 'μΩ·mm'],
    ['密度', 8.96e-6, 'kg/mm³'],
    ['裸线径 d', 0.8, 'mm'],
    ['最外圈长', 158, 'mm'],
    ['最外圈宽', 23.5, 'mm'],
    ['最内圈长', 140, 'mm'],
    ['最内圈宽', 5.5, 'mm'],
    ['匝数', 44, '匝'],
    ['每相支路数', 1, '支路'],
    ['每支路线圈数', 1, '线圈'],
    ['截面积', calculation.result.area, 'mm²'],
    ['最外圈单匝长度', calculation.result.outerTurnLength, 'mm'],
    ['最内圈单匝长度', calculation.result.innerTurnLength, 'mm'],
    ['平均单匝长度', calculation.result.averageTurnLength, 'mm'],
    ['单线圈线材长度', calculation.result.length, 'mm'],
    ['单线圈电阻', calculation.result.coilResistance, 'Ω'],
    ['单相电阻', calculation.result.phaseResistance, 'Ω'],
    ['P-P 电阻', calculation.result.lineToLineResistance, 'Ω'],
    ['单线圈重量', calculation.result.coilWeight, 'kg'],
    ['整台三相电机线圈重量', calculation.result.totalWeight, 'kg'],
  ]);
  rows.slice(2).forEach(([, value]) => assert.equal(typeof value, 'number'));
});

test('export filename uses a stable local timestamp', () => {
  const date = new Date(2026, 6, 31, 10, 30, 0);
  assert.equal(buildExportFilename('圆形线圈', date), '圆形线圈计算结果_20260731-103000.xlsx');
});

test('export orchestration downloads one valid calculation with exact workbook arguments', async () => {
  const calculation = calculateRoundCoil(ROUND_SAMPLE);
  const expectedRows = buildRoundExportRows(ROUND_SAMPLE, calculation.result);
  let downloaded;
  const error = await exportCoilCalculation({
    calculation,
    input: ROUND_SAMPLE,
    sheetName: '圆形线圈',
    buildRows: buildRoundExportRows,
    now: new Date(2026, 6, 31, 10, 30, 0),
    loadWorkbook: async () => ({
      downloadCoilWorkbook: (...args) => { downloaded = args; },
    }),
  });

  assert.equal(error, '');
  assert.deepEqual(downloaded, [
    '圆形线圈',
    expectedRows,
    '圆形线圈计算结果_20260731-103000.xlsx',
  ]);
});

test('export orchestration blocks invalid calculations without loading workbook code', async () => {
  let loaded = false;
  const error = await exportCoilCalculation({
    calculation: { valid: false, result: null },
    input: ROUND_SAMPLE,
    sheetName: '圆形线圈',
    buildRows: buildRoundExportRows,
    loadWorkbook: async () => {
      loaded = true;
      return {};
    },
  });

  assert.equal(error, '');
  assert.equal(loaded, false);
});

test('export orchestration blocks valid calculations with underflowed or overflowed results', async () => {
  const underflowed = calculateRoundCoil({ ...ROUND_SAMPLE, wireDiameter: 1e-200 });
  const overflowed = calculateMotorCoil({ ...MOTOR_SAMPLE, outerLength: Number.MAX_VALUE, outerWidth: Number.MAX_VALUE });

  assert.equal(underflowed.valid, true);
  assert.equal(overflowed.valid, true);
  assert.equal(isExportableCoilCalculation(underflowed), false);
  assert.equal(isExportableCoilCalculation(overflowed), false);

  for (const [calculation, input, sheetName, buildRows] of [
    [underflowed, { ...ROUND_SAMPLE, wireDiameter: 1e-200 }, '圆形线圈', buildRoundExportRows],
    [overflowed, { ...MOTOR_SAMPLE, outerLength: Number.MAX_VALUE, outerWidth: Number.MAX_VALUE }, '矩形线圈', buildMotorExportRows],
  ]) {
    let loaded = false;
    const error = await exportCoilCalculation({
      calculation,
      input,
      sheetName,
      buildRows,
      loadWorkbook: async () => {
        loaded = true;
        return {};
      },
    });

    assert.equal(error, '');
    assert.equal(loaded, false);
  }
});

test('export orchestration returns approved message when workbook loading fails', async () => {
  const calculation = calculateMotorCoil(MOTOR_SAMPLE);
  const error = await exportCoilCalculation({
    calculation,
    input: MOTOR_SAMPLE,
    sheetName: '矩形线圈',
    buildRows: buildMotorExportRows,
    loadWorkbook: async () => { throw new Error('load failed'); },
  });

  assert.equal(error, 'Excel 导出失败，请重试。');
});

test('export orchestration returns approved message when workbook download fails', async () => {
  const calculation = calculateMotorCoil(MOTOR_SAMPLE);
  const error = await exportCoilCalculation({
    calculation,
    input: MOTOR_SAMPLE,
    sheetName: '矩形线圈',
    buildRows: buildMotorExportRows,
    loadWorkbook: async () => ({
      downloadCoilWorkbook: () => { throw new Error('download failed'); },
    }),
  });

  assert.equal(error, 'Excel 导出失败，请重试。');
});

test('workbook preserves row values and spreadsheet column widths', () => {
  const rows = buildRoundExportRows(ROUND_SAMPLE, calculateRoundCoil(ROUND_SAMPLE).result);
  const workbook = createCoilWorkbook('圆形线圈', rows);
  const sheet = workbook.Sheets['圆形线圈'];

  assert.deepEqual(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }), rows);
  assert.deepEqual(sheet['!cols'], [{ wch: 28 }, { wch: 20 }, { wch: 14 }]);
});

test('calculateRoundCoil matches Excel default resistance', () => {
  const calculation = calculateRoundCoil(ROUND_SAMPLE);

  assert.equal(calculation.valid, true);
  assertClose(calculation.result.resistance, 2.8944296694436975);
});

test('calculateRoundCoil returns all Excel intermediates', () => {
  const { result } = calculateRoundCoil(ROUND_SAMPLE);

  assertClose(result.area, 0.292246656545325);
  assertClose(result.outerTurnLength, 225.5663524854, 1e-9);
  assertClose(result.innerTurnLength, 204.83184097560002, 1e-9);
  assertClose(result.averageTurnLength, 215.1990967305, 1e-9);
  assertClose(result.length, 49065.394054554, 1e-8);
});

test('calculateMotorCoil matches Excel default values', () => {
  const calculation = calculateMotorCoil(MOTOR_SAMPLE);

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
    material: 'copper',
    wireDiameter: 0,
    outerDiameter: Infinity,
    innerDiameter: 65.2,
    turns: 2.5,
  });
  const motor = calculateMotorCoil({
    material: 'copper',
    wireDiameter: 0.8,
    outerLength: 158,
    outerWidth: 23.5,
    innerLength: 140,
    innerWidth: 5.5,
    turns: 44.5,
    branchesPerPhase: 0,
    coilsPerBranch: 1.5,
  });

  assert.equal(round.valid, false);
  assert.deepEqual(Object.keys(round.errors).sort(), ['outerDiameter', 'turns', 'wireDiameter']);
  assert.equal(round.result, null);
  assert.equal(motor.valid, false);
  assert.deepEqual(Object.keys(motor.errors).sort(), ['branchesPerPhase', 'coilsPerBranch', 'turns']);
  assert.equal(motor.result, null);
});

test('round calculation preserves Excel average formula when outer is below inner', () => {
  const lowerOuter = calculateRoundCoil({
    material: 'copper',
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
  assert.equal(formatWeight(0.19440147191187823), '0.194401');
  assert.equal(formatLength(Number.NaN), '—');
  assert.equal(formatResistance(Infinity), '—');
  assert.equal(formatWeight(Number.NaN), '—');
});

test('round coil uses selected material for resistance and weight', () => {
  const copper = calculateRoundCoil(ROUND_SAMPLE);
  const aluminum = calculateRoundCoil({ ...ROUND_SAMPLE, material: 'aluminum' });

  assertClose(copper.result.resistance, 2.8944296694436975);
  assertClose(copper.result.coilWeight, 0.12847920838611958);
  assertClose(aluminum.result.resistance, 4.628737006181134);
  assertClose(aluminum.result.coilWeight, 0.038715832884210144);
});

test('motor coil returns single-coil and three-phase total weight', () => {
  const copper = calculateMotorCoil(MOTOR_SAMPLE);
  const aluminum = calculateMotorCoil({ ...MOTOR_SAMPLE, material: 'aluminum' });

  assertClose(copper.result.coilResistance, 0.4934780447340384);
  assertClose(copper.result.coilWeight, 0.06480049063729275);
  assertClose(copper.result.totalWeight, 0.19440147191187823);
  assertClose(aluminum.result.coilResistance, 0.7891641353432389);
  assertClose(aluminum.result.coilWeight, 0.019526933562577057);
  assertClose(aluminum.result.totalWeight, 0.05858080068773117);
});

test('motor total weight multiplies branches, coils per branch, and three phases', () => {
  const calculation = calculateMotorCoil({
    ...MOTOR_SAMPLE,
    branchesPerPhase: 2,
    coilsPerBranch: 4,
  });

  assertClose(calculation.result.totalWeight, 1.5552117752950259);
  assertClose(calculation.result.phaseResistance, 0.9869560894680768);
  assertClose(calculation.result.lineToLineResistance, 1.9739121789361536);
});

test('calculators reject unsupported materials', () => {
  const calculation = calculateRoundCoil({ ...ROUND_SAMPLE, material: 'steel' });

  assert.equal(calculation.valid, false);
  assert.deepEqual(calculation.errors, { material: '请选择有效材料。' });
  assert.equal(calculation.result, null);
});

test('calculator keeps round and motor form state independent', () => {
  assert.match(calculatorSource, /<MaterialField id="round-material" value={roundValues\.material} onChange=\{\(value\) => update\(setRoundValues, setRoundTouched, "material", value\)\} \/>/);
  assert.match(calculatorSource, /<MaterialField id="motor-material" value={motorValues\.material} onChange=\{\(value\) => update\(setMotorValues, setMotorTouched, "material", value\)\} \/>/);
  assert.match(calculatorSource, /roundFields\.map\(\(\[name, label, unit\]\) => <Field key=\{name\} id=\{`round-\$\{name\}`\} label=\{label\} unit=\{unit\} value=\{roundValues\[name\]\} error=\{roundTouched \? round\.errors\[name\] : undefined\}/);
  assert.match(calculatorSource, /motorFields\.map\(\(\[name, label, unit\]\) => <Field key=\{name\} id=\{`motor-\$\{name\}`\} label=\{label\} unit=\{unit\} value=\{motorValues\[name\]\} error=\{motorTouched \? motor\.errors\[name\] : undefined\}/);
});

test('calculator renders weight results after valid input', () => {
  assert.match(calculatorSource, /formatWeight\(round\.result\.coilWeight\)/);
  assert.match(calculatorSource, /formatWeight\(motor\.result\.coilWeight\)/);
  assert.match(calculatorSource, /formatWeight\(motor\.result\.totalWeight\)/);
  assert.match(calculatorSource, /整台三相电机线圈重量/);
  assert.doesNotMatch(calculatorSource, /铜线电阻率/);
});

test('calculator uses exportability guard for both export buttons', () => {
  assert.match(calculatorSource, /disabled=\{!isExportableCoilCalculation\(round\)\}/);
  assert.match(calculatorSource, /disabled=\{!isExportableCoilCalculation\(motor\)\}/);
});
