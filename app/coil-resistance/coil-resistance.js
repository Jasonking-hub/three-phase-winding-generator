export const PI_CIRCLE = 3.141592653;
export const PI_MOTOR = 3.1415926535;
export const COIL_MATERIALS = {
  copper: {
    label: '铜线',
    resistivity: 17.24,
    densityKgPerCubicMillimeter: 8.96e-6,
  },
  aluminum: {
    label: '铝线',
    resistivity: 27.57,
    densityKgPerCubicMillimeter: 2.7e-6,
  },
};

export function calculateRoundCoil(input) {
  const { wireDiameter, outerDiameter, innerDiameter, turns } = input;
  const errors = validatePositive(input, ['wireDiameter', 'outerDiameter', 'innerDiameter', 'turns'], ['turns']);
  const material = getMaterial(input.material, errors);
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, result: null };
  }
  const area = PI_CIRCLE * (wireDiameter / 2) ** 2;
  const outerTurnLength = PI_CIRCLE * outerDiameter;
  const innerTurnLength = PI_CIRCLE * innerDiameter;
  const averageTurnLength = (outerTurnLength + innerTurnLength) / 2;
  const length = turns * averageTurnLength;
  const resistance = material.resistivity * length / area / 1e6;
  const coilWeight = area * length * material.densityKgPerCubicMillimeter;

  return {
    valid: true,
    errors: {},
    result: { area, outerTurnLength, innerTurnLength, averageTurnLength, length, resistance, coilWeight },
  };
}

export function calculateMotorCoil(input) {
  const {
    wireDiameter,
    outerLength,
    outerWidth,
    innerLength,
    innerWidth,
    turns,
    branchesPerPhase,
    coilsPerBranch,
  } = input;
  const errors = validatePositive(
    input,
    ['wireDiameter', 'outerLength', 'outerWidth', 'innerLength', 'innerWidth', 'turns', 'branchesPerPhase', 'coilsPerBranch'],
    ['turns', 'branchesPerPhase', 'coilsPerBranch'],
  );
  const material = getMaterial(input.material, errors);
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, result: null };
  }

  const area = PI_MOTOR * (wireDiameter / 2) ** 2;
  const outerTurnLength = 2 * (outerLength + outerWidth);
  const innerTurnLength = 2 * (innerLength + innerWidth);
  const averageTurnLength = (outerTurnLength + innerTurnLength) / 2;
  const length = turns * averageTurnLength;
  const coilResistance = material.resistivity * length / area / 1e6;
  const phaseResistance = coilResistance * coilsPerBranch / branchesPerPhase;
  const lineToLineResistance = 2 * phaseResistance;
  const coilWeight = area * length * material.densityKgPerCubicMillimeter;
  const totalWeight = coilWeight * 3 * branchesPerPhase * coilsPerBranch;

  return {
    valid: true,
    errors: {},
    result: {
      area,
      outerTurnLength,
      innerTurnLength,
      averageTurnLength,
      length,
      coilResistance,
      phaseResistance,
      lineToLineResistance,
      coilWeight,
      totalWeight,
    },
  };
}

export function formatLength(value) {
  return Number.isFinite(value) ? value.toFixed(3) : '—';
}

export function formatResistance(value) {
  return Number.isFinite(value) ? value.toFixed(6) : '—';
}

export function formatWeight(value) {
  return Number.isFinite(value) ? value.toFixed(6) : '—';
}

function getMaterial(materialId, errors) {
  if (!Object.hasOwn(COIL_MATERIALS, materialId)) {
    errors.material = '请选择有效材料。';
    return null;
  }
  return COIL_MATERIALS[materialId];
}

function validatePositive(input, fields, integerFields) {
  return fields.reduce((errors, field) => {
    const value = input[field];
    if (!Number.isFinite(value)) {
      errors[field] = '请输入有效数值。';
    } else if (value <= 0) {
      errors[field] = '必须大于 0。';
    } else if (integerFields.includes(field) && !Number.isInteger(value)) {
      errors[field] = '必须为整数。';
    }
    return errors;
  }, {});
}
