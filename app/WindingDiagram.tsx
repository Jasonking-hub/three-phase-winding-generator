"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIAGRAM_COIL_STROKE_WIDTH,
  DIAGRAM_TOOTH_PITCH,
  DIAGRAM_TOOTH_WIDTH,
  buildWindingDiagramModel,
  diagramScaleFromWheel,
  fixedCoilGeometry,
} from "./winding.js";

const PHASE_STROKE = {
  A: "#bc6200",
  U: "#bc6200",
  B: "#245ba9",
  V: "#245ba9",
  C: "#007a70",
  W: "#007a70",
};

const TOOTH_TOP = 112;
const TOOTH_HEIGHT = 252;
const CORE_START = 90;
const LABEL_Y = 426;
const ROUTE_START_Y = 486;
const ROUTE_GAP = 48;
const DIAGRAM_HEIGHT = 630;

type WindingRow = {
  coil: number;
  upperSlot: number;
  lowerSlot: number;
  phase: string;
  displayPhase: string;
  upperMark: string;
  polarity: string;
  electricalAngle: number;
};

type WindingConnection = {
  phase: string;
  displayPhase: string;
  terminal: string;
};

type DiagramCoil = WindingRow & {
  label: string;
};

type WindingResult = {
  valid: boolean;
  rows: WindingRow[];
  connections: WindingConnection[];
};

type CoilGeometry = {
  centerX: number;
  leftX: number;
  rightX: number;
  topY: number;
  bottomY: number;
};

function serialRoute(
  coils: WindingRow[],
  geometryByCoil: Map<number, CoilGeometry>,
  routeY: number,
  width: number,
) {
  if (coils.length === 0) return "";

  const first = geometryByCoil.get(coils[0].coil);
  const last = geometryByCoil.get(coils[coils.length - 1].coil);
  if (!first || !last) return "";

  const sections = [`M 78 ${routeY} H ${first.leftX} V ${first.bottomY}`];

  for (let index = 0; index < coils.length - 1; index += 1) {
    const current = geometryByCoil.get(coils[index].coil);
    const next = geometryByCoil.get(coils[index + 1].coil);
    if (!current || !next) continue;
    sections.push(
      `M ${current.rightX} ${current.bottomY} V ${routeY} H ${next.leftX} V ${next.bottomY}`,
    );
  }

  sections.push(
    `M ${last.rightX} ${last.bottomY} V ${routeY} H ${width - 78}`,
  );
  return sections.join(" ");
}

export default function WindingDiagram({ winding }: { winding: WindingResult }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const model = useMemo(
    () => buildWindingDiagramModel(winding.rows, winding.connections),
    [winding.connections, winding.rows],
  );

  const naturalWidth = Math.max(
    820,
    CORE_START * 2 + model.slotCount * DIAGRAM_TOOTH_PITCH,
  );
  const scaledWidth = naturalWidth * scale;
  const scaledHeight = DIAGRAM_HEIGHT * scale;
  const sectionClass =
    model.slotCount >= 12 ? "winding-diagram is-wide" : "winding-diagram";

  const geometryByCoil = useMemo(
    () =>
      new Map<number, CoilGeometry>(
        model.coils.map((coil: DiagramCoil, index: number) => [
          coil.coil,
          fixedCoilGeometry(index, CORE_START),
        ]),
      ),
    [model.coils],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const currentScale = scaleRef.current;
      const nextScale = diagramScaleFromWheel(currentScale, event.deltaY);
      if (nextScale === currentScale) return;

      const bounds = viewport.getBoundingClientRect();
      const localX = event.clientX - bounds.left;
      const localY = event.clientY - bounds.top;
      const contentX = viewport.scrollLeft + localX;
      const contentY = viewport.scrollTop + localY;
      const ratio = nextScale / currentScale;

      scaleRef.current = nextScale;
      setScale(nextScale);

      requestAnimationFrame(() => {
        viewport.scrollLeft = contentX * ratio - localX;
        viewport.scrollTop = contentY * ratio - localY;
      });
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

  if (!winding.valid) {
    return <div className="diagram-empty">输入有效的 Q 和 P 后显示三相接线图。</div>;
  }

  return (
    <section className={sectionClass} aria-labelledby="diagram-title">
      <div className="diagram-heading">
        <div>
          <h3 id="diagram-title">三相接线图</h3>
          <p>铁芯、左右双层线圈与同相串联关系随当前参数同步更新。</p>
        </div>
        <span className="diagram-zoom-value" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div
        ref={viewportRef}
        className="diagram-scroll"
        tabIndex={0}
        aria-label="三相接线图，鼠标滚轮缩放"
      >
        <svg
          viewBox={`0 0 ${naturalWidth} ${DIAGRAM_HEIGHT}`}
          style={{ width: scaledWidth, height: scaledHeight }}
          role="img"
          aria-labelledby="diagram-title diagram-description"
        >
          <desc id="diagram-description">
            {`${model.slotCount} 个铁芯齿、${model.coils.length} 个等尺寸线圈及三相串联引线。`}
          </desc>

          <g className="diagram-core">
            {Array.from({ length: model.toothCount }, (_, index) => (
              <rect
                key={`tooth-${index + 1}`}
                className="diagram-core-tooth"
                x={CORE_START + index * DIAGRAM_TOOTH_PITCH}
                y={TOOTH_TOP}
                width={DIAGRAM_TOOTH_WIDTH}
                height={TOOTH_HEIGHT}
              />
            ))}
          </g>

          <g className="diagram-coils">
            {model.coils.map((coil: DiagramCoil) => {
              const geometry = geometryByCoil.get(coil.coil);
              if (!geometry) return null;
              const stroke =
                PHASE_STROKE[
                  coil.displayPhase as keyof typeof PHASE_STROKE
                ];
              return (
                <g key={`coil-${coil.coil}`} style={{ color: stroke }}>
                  <rect
                    className="diagram-coil"
                    x={geometry.leftX}
                    y={geometry.topY}
                    width={geometry.rightX - geometry.leftX}
                    height={geometry.bottomY - geometry.topY}
                    rx="20"
                    strokeWidth={DIAGRAM_COIL_STROKE_WIDTH}
                  />
                  <text
                    className="diagram-coil-label"
                    x={geometry.centerX}
                    y={LABEL_Y}
                  >
                    {coil.label}
                  </text>
                </g>
              );
            })}
          </g>

          <g className="diagram-routes">
            {model.groups.map(
              (
                group: WindingConnection & { coils: DiagramCoil[] },
                groupIndex: number,
              ) => {
                const stroke =
                  PHASE_STROKE[
                    group.displayPhase as keyof typeof PHASE_STROKE
                  ];
                const routeY = ROUTE_START_Y + groupIndex * ROUTE_GAP;
                const [startTerminal, endTerminal] = group.terminal.split(" / ");
                return (
                  <g key={group.phase} style={{ color: stroke }}>
                    <path
                      className="diagram-series-line"
                      d={serialRoute(
                        group.coils,
                        geometryByCoil,
                        routeY,
                        naturalWidth,
                      )}
                    />
                    <text className="diagram-phase-label" x="18" y={routeY + 5}>
                      {group.displayPhase} 相 {startTerminal}
                    </text>
                    <text
                      className="diagram-terminal"
                      x={naturalWidth - 18}
                      y={routeY + 5}
                      textAnchor="end"
                    >
                      {endTerminal}
                    </text>
                  </g>
                );
              },
            )}
          </g>
        </svg>
      </div>
    </section>
  );
}
