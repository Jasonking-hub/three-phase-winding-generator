import { COIL_MATERIALS } from './coil-resistance.js';

const HEADER = [['项目', '数值', '单位']];

function materialRows(input) {
  const material = COIL_MATERIALS[input.material];
  return [
    ['线圈材料', material.label, ''],
    ['电阻率', material.resistivity, 'μΩ·mm'],
    ['密度', material.densityKgPerCubicMillimeter, 'kg/mm³'],
  ];
}

export function buildRoundExportRows(input, result) {
  return [
    ...HEADER,
    ...materialRows(input),
    ['单根裸线径 d', input.wireDiameter, 'mm'],
    ['并绕根数', input.parallelWires ?? 1, '根'],
    ['最外圈直径', input.outerDiameter, 'mm'],
    ['最内圈直径', input.innerDiameter, 'mm'],
    ['匝数', input.turns, '匝'],
    ['每相并联支路数', input.branchesPerPhase ?? 1, '支路'],
    ['每支路线圈数', input.coilsPerBranch ?? 1, '线圈'],
    ['单根截面积', result.area, 'mm²'],
    ['并绕总截面积', result.effectiveArea, 'mm²'],
    ['最外圈单匝长度', result.outerTurnLength, 'mm'],
    ['最内圈单匝长度', result.innerTurnLength, 'mm'],
    ['平均单匝长度', result.averageTurnLength, 'mm'],
    ['每根线长度', result.length, 'mm'],
    ['单线圈总用线长度', result.totalWireLength, 'mm'],
    ['单线圈电阻', result.resistance, 'Ω'],
    ['单相电阻', result.phaseResistance, 'Ω'],
    ['P-P 电阻（星形）', result.lineToLineResistance, 'Ω'],
    ['单线圈重量', result.coilWeight, 'kg'],
    ['整台三相电机线圈重量', result.totalWeight, 'kg'],
  ];
}

export function buildMotorExportRows(input, result) {
  return [
    ...HEADER,
    ...materialRows(input),
    ['单根裸线径 d', input.wireDiameter, 'mm'],
    ['并绕根数', input.parallelWires ?? 1, '根'],
    ['最外圈长', input.outerLength, 'mm'],
    ['最外圈宽', input.outerWidth, 'mm'],
    ['最内圈长', input.innerLength, 'mm'],
    ['最内圈宽', input.innerWidth, 'mm'],
    ['匝数', input.turns, '匝'],
    ['每相并联支路数', input.branchesPerPhase, '支路'],
    ['每支路线圈数', input.coilsPerBranch, '线圈'],
    ['单根截面积', result.area, 'mm²'],
    ['并绕总截面积', result.effectiveArea, 'mm²'],
    ['最外圈单匝长度', result.outerTurnLength, 'mm'],
    ['最内圈单匝长度', result.innerTurnLength, 'mm'],
    ['平均单匝长度', result.averageTurnLength, 'mm'],
    ['每根线长度', result.length, 'mm'],
    ['单线圈总用线长度', result.totalWireLength, 'mm'],
    ['单线圈电阻', result.coilResistance, 'Ω'],
    ['单相电阻', result.phaseResistance, 'Ω'],
    ['P-P 电阻（星形）', result.lineToLineResistance, 'Ω'],
    ['单线圈重量', result.coilWeight, 'kg'],
    ['整台三相电机线圈重量', result.totalWeight, 'kg'],
  ];
}

export function buildExportFilename(label, date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${label}计算结果_${stamp}.xlsx`;
}

export function isExportableCoilCalculation(calculation) {
  return calculation.valid
    && calculation.result
    && Object.values(calculation.result).every(Number.isFinite);
}

export async function exportCoilCalculation({
  calculation,
  input,
  sheetName,
  buildRows,
  now = new Date(),
  loadWorkbook = () => import('./coil-workbook.js'),
}) {
  if (!isExportableCoilCalculation(calculation)) return '';
  try {
    const { downloadCoilWorkbook } = await loadWorkbook();
    downloadCoilWorkbook(
      sheetName,
      buildRows(input, calculation.result),
      buildExportFilename(sheetName, now),
    );
    return '';
  } catch {
    return 'Excel 导出失败，请重试。';
  }
}
