export const PACKING_MODES = {
  SAME: "same-count",
  BOUNDARY: "within-boundary",
};

const NORMAL = "正常";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateMode(mode, errors) {
  if (mode !== PACKING_MODES.SAME && mode !== PACKING_MODES.BOUNDARY) {
    errors.mode = "请选择有效的排布模式。";
  }
}

function validateDimension(value, name, errors) {
  if (!isFiniteNumber(value) || value < 0) {
    errors[name] = "请输入大于或等于 0 的有限数值。";
  }
}

function invalid(errors) {
  return { valid: false, errors, warning: NORMAL, result: null };
}

function buildDimensions(diameter, layers, roots, mode) {
  const verticalPitch = diameter * Math.sqrt(3) / 2;
  const offset = diameter / 2;
  const height = diameter + (layers - 1) * verticalPitch;
  const width = mode === PACKING_MODES.SAME
    ? roots * diameter + (layers >= 2 ? offset : 0)
    : roots * diameter;
  const total = mode === PACKING_MODES.SAME
    ? layers * roots
    : Math.ceil(layers / 2) * roots + Math.floor(layers / 2) * Math.max(roots - 1, 0);

  return { verticalPitch, offset, height, width, total };
}

function zeroDimensions(diameter = 0) {
  return {
    verticalPitch: diameter * Math.sqrt(3) / 2,
    offset: diameter / 2,
    height: 0,
    width: 0,
    total: 0,
  };
}

export function calculateLayerDimensions({ diameter, layers, roots, mode }) {
  const errors = {};
  validateDimension(diameter, "diameter", errors);
  if (!Number.isInteger(layers) || layers <= 0) errors.layers = "层数必须为正整数。";
  if (!Number.isInteger(roots) || roots <= 0) errors.roots = "水平根数必须为正整数。";
  validateMode(mode, errors);
  if (Object.keys(errors).length) return invalid(errors);

  const result = buildDimensions(diameter, layers, roots, mode);
  const warning = mode === PACKING_MODES.BOUNDARY && layers >= 2 && roots < 2
    ? "注意：水平根数小于 2 时，无法形成完整品字形错排。"
    : NORMAL;
  return { valid: true, errors: {}, warning, result };
}

export function calculateCapacity({ diameter, maxWidth, maxThickness, mode }) {
  const errors = {};
  validateDimension(diameter, "diameter", errors);
  validateDimension(maxWidth, "maxWidth", errors);
  validateDimension(maxThickness, "maxThickness", errors);
  validateMode(mode, errors);
  if (Object.keys(errors).length) return invalid(errors);

  const verticalPitch = diameter * Math.sqrt(3) / 2;
  const layers = diameter <= 0 || maxThickness < diameter
    ? 0
    : 1 + Math.floor((maxThickness - diameter) / verticalPitch);
  const roots = diameter <= 0 || maxWidth < diameter || layers === 0
    ? 0
    : mode === PACKING_MODES.SAME && layers >= 2
      ? Math.max(0, Math.floor((maxWidth - diameter / 2) / diameter))
      : Math.floor(maxWidth / diameter);
  const dimensions = layers === 0 || roots === 0
    ? zeroDimensions(diameter)
    : buildDimensions(diameter, layers, roots, mode);
  const result = {
    ...dimensions,
    layers,
    roots,
    remainingWidth: maxWidth - dimensions.width,
    remainingThickness: maxThickness - dimensions.height,
  };
  const warning = mode === PACKING_MODES.BOUNDARY && layers >= 2 && roots < 2
    ? "注意：水平宽度不足以形成完整品字形错排。"
    : mode === PACKING_MODES.SAME && layers >= 2 && maxWidth < 1.5 * diameter
      ? "注意：宽度不足以排下两层错位后的最小外包络。"
      : NORMAL;

  return { valid: true, errors: {}, warning, result };
}

export function formatDimension(value) {
  return isFiniteNumber(value) ? value.toFixed(3) : "—";
}

export function formatInteger(value) {
  return isFiniteNumber(value) ? String(Math.trunc(value)) : "—";
}
