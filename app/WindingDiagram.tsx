"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIAGRAM_COIL_STROKE_WIDTH,
  DIAGRAM_TOOTH_PITCH,
  DIAGRAM_TOOTH_WIDTH,
  buildPhaseRouteLayouts,
  buildSeriesRouteSegments,
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
const STAR_RIGHT_GUTTER = 120;
const LABEL_Y = 426;
const ROUTE_START_Y = 486;
const ROUTE_LANE_GAP = 24;
const PHASE_ROUTE_GAP = 36;
const ROUTE_BOTTOM_GUTTER = 72;
const DIAGRAM_VIEWPORT_MAX_HEIGHT = 980;

type WindingRow = {
  coil: number;
  upperSlot: number;
  lowerSlot: number;
  phase: string;
  displayPhase: string;
  upperMark: string;
  polarity: string;
  electricalAngle: number;
  branch: number;
  branchOrder: number;
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
  pitch: number;
  parallelBranches: number;
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
    CORE_START * 2 +
      model.slotCount * DIAGRAM_TOOTH_PITCH +
      STAR_RIGHT_GUTTER,
  );
  const starX = naturalWidth - 108;
  const phaseRouteLayouts = buildPhaseRouteLayouts(
    model.routes,
    ROUTE_START_Y,
    ROUTE_LANE_GAP,
    PHASE_ROUTE_GAP,
  );
  const starEndYs = phaseRouteLayouts.map(
    ({ endY }: { endY: number }) => endY,
  );
  const starTopY =
    starEndYs.length > 0 ? Math.min(...starEndYs) : ROUTE_START_Y;
  const starBottomY =
    starEndYs.length > 0 ? Math.max(...starEndYs) : ROUTE_START_Y;
  const starY = (starTopY + starBottomY) / 2;
  const diagramHeight = starBottomY + ROUTE_BOTTOM_GUTTER;
  const viewportHeight = Math.min(
    diagramHeight,
    DIAGRAM_VIEWPORT_MAX_HEIGHT,
  );
  const scaledWidth = naturalWidth * scale;
  const scaledHeight = diagramHeight * scale;
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
    return <div className="diagram-empty">输入有效的 Q、P 和 y 后显示三相接线图。</div>;
  }

  return (
    <section className={sectionClass} aria-labelledby="diagram-title">
      <div className="diagram-heading">
        <div>
          <h3 id="diagram-title">三相接线图</h3>
          <p>节距 y = {winding.pitch}，每相 {winding.parallelBranches} 路。展开接线示意，图形宽度不代表节距；槽对标明上层槽 / 下层槽。</p>
        </div>
        <span className="diagram-zoom-value" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div
        ref={viewportRef}
        className="diagram-scroll"
        style={{ height: viewportHeight }}
        tabIndex={0}
        aria-label="三相接线图，鼠标滚轮缩放"
      >
        <svg
          viewBox={`0 0 ${naturalWidth} ${diagramHeight}`}
          style={{ width: scaledWidth, height: scaledHeight }}
          role="img"
          aria-labelledby="diagram-title diagram-description"
        >
          <desc id="diagram-description">
            {`${model.coils.length} 个线圈，每相 ${winding.parallelBranches} 路，支路内部按极性串联，同相支路共用首端，末端接星形公共点。图形宽度不代表节距。`}
          </desc>

          <defs>
            {model.groups.map(
              (group: WindingConnection & { coils: DiagramCoil[] }) => {
                const stroke =
                  PHASE_STROKE[
                    group.displayPhase as keyof typeof PHASE_STROKE
                  ];
                return (
                  <marker
                    key={`arrow-${group.phase}`}
                    id={`route-arrow-${group.phase}`}
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M 0 0 L 8 4 L 0 8 Z" fill={stroke} />
                  </marker>
                );
              },
            )}
          </defs>

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
                  <text
                    className="diagram-coil-label"
                    x={geometry.centerX}
                    y={LABEL_Y + 24}
                  >
                    {coil.upperSlot}/{coil.lowerSlot}
                  </text>
                </g>
              );
            })}
          </g>

          <g className="diagram-routes">
            {model.routes.map(
              (
                group: WindingConnection & { branch: number; coils: DiagramCoil[] },
                groupIndex: number,
              ) => {
                const stroke =
                  PHASE_STROKE[
                    group.displayPhase as keyof typeof PHASE_STROKE
                  ];
                const layout = phaseRouteLayouts[groupIndex];
                const segments = buildSeriesRouteSegments(
                  group.coils,
                  geometryByCoil,
                  layout.laneYs,
                  78,
                  starX,
                );
                const [startTerminal] = group.terminal.split(" / ");
                return (
                  <g key={`${group.phase}-${group.branch}`} style={{ color: stroke }} data-phase={group.phase} data-branch={group.branch}>
                    {segments.map(
                      (segment: {
                        order: number;
                        laneY: number;
                        labelX: number;
                        d: string;
                      }) => (
                        <g key={`${group.phase}-${group.branch}-${segment.order}`}>
                          <path
                            className="diagram-series-line"
                            d={segment.d}
                            markerEnd={`url(#route-arrow-${group.phase})`}
                          />
                          <g
                            className="diagram-route-order-badge"
                            transform={`translate(${segment.labelX} ${segment.laneY - 9})`}
                          >
                            <circle r="9" />
                            <text className="diagram-route-order" y="4">
                              {segment.order}
                            </text>
                          </g>
                        </g>
                      ),
                    )}
                    <text
                      className="diagram-phase-label"
                      x="18"
                      y={layout.startY + 5}
                    >
                      {group.displayPhase}{group.branch} {startTerminal}
                    </text>
                  </g>
                );
              },
            )}
            {model.groups.map((group: WindingConnection) => {
              const layouts = phaseRouteLayouts.filter((_: unknown, index: number) =>
                model.routes[index].phase === group.phase);
              if (layouts.length === 0) return null;
              const stroke = PHASE_STROKE[group.displayPhase as keyof typeof PHASE_STROKE];
              return (
                <g key={`phase-bus-${group.phase}`} style={{ color: stroke }}>
                  <path className="diagram-series-line" d={`M 78 ${layouts[0].startY} V ${layouts[layouts.length - 1].startY}`} />
                  {layouts.map(({ startY, endY }: { startY: number; endY: number }) => (
                    <g key={startY}>
                      <circle cx={78} cy={startY} r={4} fill="currentColor" />
                      <circle cx={starX} cy={endY} r={4} fill="currentColor" />
                    </g>
                  ))}
                </g>
              );
            })}
            <g className="diagram-star-point">
              <path
                className="diagram-star-bus"
                d={`M ${starX} ${starTopY} V ${starBottomY}`}
              />
              <circle
                className="diagram-star-node"
                cx={starX}
                cy={starY}
                r="5"
              />
              <text
                className="diagram-star-label"
                x={starX + 14}
                y={starY - 5}
              >
                中性点 N
              </text>
              <text
                className="diagram-star-terminals"
                x={starX + 14}
                y={starY + 15}
              >
                U2 / V2 / W2
              </text>
            </g>
          </g>
        </svg>
      </div>
    </section>
  );
}
