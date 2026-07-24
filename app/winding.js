const PHASES = ["A", "B", "C"];

export const DIAGRAM_MIN_SCALE = 0.6;
export const DIAGRAM_MAX_SCALE = 2.2;
export const DIAGRAM_TOOTH_PITCH = 80;
export const DIAGRAM_TOOTH_WIDTH = 46;
export const DIAGRAM_COIL_WIDTH = 64;
export const DIAGRAM_COIL_STROKE_WIDTH = 10;
export const DIAGRAM_COIL_TOP = 66;
export const DIAGRAM_COIL_BOTTOM = 386;

export function fixedCoilGeometry(slotIndex, coreStart) {
  const centerX =
    coreStart + slotIndex * DIAGRAM_TOOTH_PITCH + DIAGRAM_TOOTH_WIDTH / 2;

  return {
    centerX,
    leftX: centerX - DIAGRAM_COIL_WIDTH / 2,
    rightX: centerX + DIAGRAM_COIL_WIDTH / 2,
    topY: DIAGRAM_COIL_TOP,
    bottomY: DIAGRAM_COIL_BOTTOM,
  };
}

export function coilConnectionEndpoints(coil, geometry) {
  return coil.polarity === "-"
    ? { entryX: geometry.rightX, exitX: geometry.leftX }
    : { entryX: geometry.leftX, exitX: geometry.rightX };
}

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

  const last = coilConnectionEndpoints(
    coils[coils.length - 1],
    lastGeometry,
  );
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

export function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export function diagramScaleFromWheel(currentScale, deltaY) {
  const factor = deltaY < 0 ? 1.1 : 0.9;
  return Math.min(
    DIAGRAM_MAX_SCALE,
    Math.max(
      DIAGRAM_MIN_SCALE,
      Math.round(currentScale * factor * 1000) / 1000,
    ),
  );
}

export function isValidWinding(slots, poles) {
  return (
    Number.isInteger(slots) &&
    Number.isInteger(poles) &&
    slots >= 3 &&
    slots <= 120 &&
    poles >= 2 &&
    poles <= 120 &&
    poles % 2 === 0 &&
    slots % 3 === 0
  );
}

function basePhase(belt) {
  if (belt === 0 || belt === 3) return "A";
  if (belt === 1 || belt === 4) return "B";
  return "C";
}

function phaseForDisplay(phase, notation) {
  if (notation === "UVW") {
    return { A: "U", B: "V", C: "W" }[phase];
  }
  return phase;
}

function terminalFor(phase) {
  return { A: "U1 / U2", B: "V1 / V2", C: "W1 / W2" }[phase];
}

export function buildWindingDiagram(rows, connections) {
  return connections.map(({ phase, displayPhase, terminal }) => ({
    phase,
    displayPhase,
    terminal,
    coils: rows
      .filter((row) => row.phase === phase)
      .map(({ coil, upperSlot, lowerSlot, upperMark, lowerMark, polarity }) => ({
        coil,
        upperSlot,
        lowerSlot,
        upperMark,
        lowerMark,
        polarity,
      })),
  }));
}

export function buildWindingDiagramModel(rows, connections) {
  const coils = rows.map((row) => ({
    ...row,
    label: row.upperMark,
  }));

  return {
    slotCount: rows.length,
    toothCount: rows.length,
    coils,
    groups: connections.map((connection) => ({
      ...connection,
      coils: coils.filter((coil) => coil.phase === connection.phase),
    })),
  };
}

export function generateWinding({ slots, poles, notation = "ABC", swapBC = false }) {
  const recommendedPitch = Math.max(1, Math.floor(slots / poles));
  const valid = isValidWinding(slots, poles);

  if (!valid) {
    return {
      recommendedPitch,
      valid,
      rows: [],
      connections: [],
    };
  }

  const rows = Array.from({ length: slots }, (_, index) => {
    const coil = index + 1;
    const lowerSlot = 1 + positiveModulo(index + recommendedPitch, slots);
    const electricalAngle = positiveModulo(
      (index + recommendedPitch / 2) * 180 * poles / slots - 90,
      360,
    );
    const belt = Math.floor(positiveModulo(electricalAngle - 0.1 + 30, 360) / 60);
    const originalPhase = basePhase(belt);
    const phase = swapBC
      ? ({ A: "A", B: "C", C: "B" })[originalPhase]
      : originalPhase;
    const polarity = belt === 0 || belt === 2 || belt === 4 ? "+" : "-";
    const displayPhase = phaseForDisplay(phase, notation);

    return {
      coil,
      upperSlot: coil,
      lowerSlot,
      phase,
      displayPhase,
      upperMark: `${displayPhase}${polarity}`,
      lowerMark: `${displayPhase}${polarity === "+" ? "-" : "+"}`,
      connection: `${displayPhase}${polarity} → ${displayPhase}${polarity === "+" ? "-" : "+"}`,
      polarity,
      electricalAngle: Math.round(electricalAngle * 100) / 100,
    };
  });

  const connectionPhases = swapBC ? ["A", "C", "B"] : PHASES;
  const connections = connectionPhases.map((phase) => {
    const displayPhase = phaseForDisplay(phase, notation);
    return {
      phase,
      displayPhase,
      rule: `${displayPhase}+ 与 ${displayPhase}- 组按同相串联`,
      terminal: terminalFor(phase),
    };
  });

  return { recommendedPitch, valid, rows, connections };
}
