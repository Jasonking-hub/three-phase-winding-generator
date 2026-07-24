const PHASES = ["A", "B", "C"];

export function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
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
