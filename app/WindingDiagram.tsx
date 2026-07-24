import { buildWindingDiagram } from "./winding.js";

const PHASE_STROKE = {
  A: "#bc6200",
  U: "#bc6200",
  B: "#245ba9",
  V: "#245ba9",
  C: "#007a70",
  W: "#007a70",
};

type WindingResult = {
  valid: boolean;
  rows: Array<{
    coil: number;
    upperSlot: number;
    lowerSlot: number;
    upperMark: string;
    lowerMark: string;
    polarity: string;
  }>;
  connections: Array<{
    phase: string;
    displayPhase: string;
    terminal: string;
  }>;
};

function coilPath(startX: number, endX: number, coilY: number) {
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  return `M ${left} 314 V ${coilY + 10} Q ${left} ${coilY} ${left + 10} ${coilY} H ${right - 10} Q ${right} ${coilY} ${right} ${coilY + 10} V 314`;
}

export default function WindingDiagram({ winding }: { winding: WindingResult }) {
  if (!winding.valid) {
    return <div className="diagram-empty">输入有效的 Q 和 P 后显示三相接线图。</div>;
  }

  const groups = buildWindingDiagram(winding.rows, winding.connections);
  const width = Math.max(820, 96 + winding.rows.length * 64);
  const slotX = (slot: number) => 72 + (slot - 1) * 64;

  return (
    <section className="winding-diagram" aria-labelledby="diagram-title">
      <div className="diagram-heading">
        <h3 id="diagram-title">三相接线图</h3>
        <p>同相线圈按主线串联。槽号与正负端随当前相别同步更新。</p>
      </div>
      <div className="diagram-scroll">
        <svg viewBox={`0 0 ${width} 440`} style={{ width }} role="img" aria-label="三相线圈接线图">
          <title>三相线圈接线图</title>
          <line className="diagram-baseline" x1="54" x2={width - 24} y1="314" y2="314" />
          {winding.rows.map((row) => {
            const x = slotX(row.upperSlot);
            return (
              <g key={`slot-${row.upperSlot}`} className="diagram-slot">
                <line x1={x} x2={x} y1="298" y2="334" />
                <text x={x} y="356">{row.upperSlot}</text>
              </g>
            );
          })}
          {groups.map((group: { phase: string; displayPhase: string; terminal: string; coils: WindingResult["rows"] }, groupIndex: number) => {
            const stroke = PHASE_STROKE[group.displayPhase as keyof typeof PHASE_STROKE];
            const busY = 38 + groupIndex * 70;
            return (
              <g key={group.phase} style={{ color: stroke }}>
                <text className="diagram-phase-label" x="16" y={busY + 5}>{group.displayPhase} 相</text>
                <text className="diagram-terminal" x={width - 18} y={busY + 5} textAnchor="end">{group.terminal}</text>
                <path className="diagram-bus" d={`M 62 ${busY} H ${width - 26}`} />
                {group.coils.map((coil, coilIndex) => {
                  const startX = slotX(coil.upperSlot);
                  const endX = slotX(coil.lowerSlot);
                  const coilY = 252 - (coilIndex % 3) * 34;
                  return (
                    <g key={coil.coil}>
                      <path className="diagram-lead" d={`M ${startX} ${busY} V ${coilY}`} />
                      <path className="diagram-coil" d={coilPath(startX, endX, coilY)} />
                      <text className="diagram-mark" x={startX} y="385">{coil.upperMark}</text>
                      <text className="diagram-mark" x={endX} y="408">{coil.lowerMark}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
