"use client";

import { useMemo, useState } from "react";
import {
  PACKING_MODES,
  buildPackingPreviewGeometry,
  calculateCapacity,
  calculateLayerDimensions,
  formatDimension,
  formatInteger,
  parseRequiredNumber,
} from "./wire-layout.js";
import styles from "./wire-layout.module.css";

type Mode = (typeof PACKING_MODES)[keyof typeof PACKING_MODES];
type RawFields = Record<string, string>;

const modes: { value: Mode; label: string }[] = [
  { value: PACKING_MODES.SAME, label: "每层同根数" },
  { value: PACKING_MODES.BOUNDARY, label: "边界内错排" },
];

function parse(raw: string) {
  return parseRequiredNumber(raw).value;
}

function fieldError(raw: string, calculationError?: string) {
  const parsed = parseRequiredNumber(raw);
  return parsed.valid ? calculationError : parsed.error;
}

function Field({ id, label, unit, value, error, onChange }: {
  id: string; label: string; unit: string; value: string; error?: string; onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.inputGroup}>
      <input id={id} type="number" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />
      <span>{unit}</span>
    </div>
    {error ? <p id={errorId} className={styles.error}>{error}</p> : null}
  </div>;
}

function ModeControl({ value, onChange, label }: { value: Mode; onChange: (mode: Mode) => void; label: string }) {
  return <fieldset className={styles.modeControl}>
    <legend>{label}</legend>
    <div role="group" aria-label={label} className={styles.segments}>
      {modes.map((mode) => <button key={mode.value} type="button" className={value === mode.value ? styles.selected : ""} aria-pressed={value === mode.value} onClick={() => onChange(mode.value)}>{mode.label}</button>)}
    </div>
  </fieldset>;
}

function ResultRow({ label, value, unit = "mm" }: { label: string; value: number; unit?: string }) {
  return <div className={styles.resultRow}><span>{label}</span><strong>{unit ? formatDimension(value) : formatInteger(value)}</strong>{unit ? <small>{unit}</small> : null}</div>;
}

function PackingPreview({ diameter, layers, roots, mode }: { diameter: number; layers: number; roots: number; mode: Mode }) {
  const preview = buildPackingPreviewGeometry({ diameter, layers, roots, mode });
  const safeDiameter = Number.isFinite(diameter) && diameter > 0 ? diameter : 1;
  const padding = safeDiameter * .4;
  const viewWidth = Math.max(preview.width, safeDiameter) + 2 * padding;
  const viewHeight = Math.max(preview.height, safeDiameter) + 2 * padding;

  return <figure className={styles.preview} aria-labelledby="packing-preview-title">
    <figcaption id="packing-preview-title"><strong>梅花形密排预览</strong><span>左、下边界为外包络基准</span></figcaption>
    <svg viewBox={`${-padding} ${-padding} ${viewWidth} ${viewHeight}`} role="img" aria-label="圆线梅花形密排图">
      <line x1={0} y1={0} x2={0} y2={preview.bottomBoundaryY} className={styles.boundary} />
      <line x1={0} y1={preview.bottomBoundaryY} x2={preview.width} y2={preview.bottomBoundaryY} className={styles.boundary} />
      {preview.circles.map(({ cx, cy, r }, index) => <circle key={index} cx={cx} cy={cy} r={r} className={styles.wire} />)}
    </svg>
    {preview.truncated ? <p>预览已截取</p> : null}
  </figure>;
}

export default function WireLayoutCalculator() {
  const [layerInput, setLayerInput] = useState<RawFields>({ diameter: "0.87", layers: "11", roots: "4" });
  const [capacityInput, setCapacityInput] = useState<RawFields>({ diameter: "0.62", maxWidth: "1.8", maxThickness: "3.6" });
  const [layerMode, setLayerMode] = useState<Mode>(PACKING_MODES.SAME);
  const [capacityMode, setCapacityMode] = useState<Mode>(PACKING_MODES.SAME);
  const layer = useMemo(() => calculateLayerDimensions({ diameter: parse(layerInput.diameter), layers: parse(layerInput.layers), roots: parse(layerInput.roots), mode: layerMode }), [layerInput, layerMode]);
  const capacity = useMemo(() => calculateCapacity({ diameter: parse(capacityInput.diameter), maxWidth: parse(capacityInput.maxWidth), maxThickness: parse(capacityInput.maxThickness), mode: capacityMode }), [capacityInput, capacityMode]);
  const setLayer = (name: string) => (value: string) => setLayerInput((current) => ({ ...current, [name]: value }));
  const setCapacity = (name: string) => (value: string) => setCapacityInput((current) => ({ ...current, [name]: value }));

  return <main className={styles.page}>
    <header className={styles.header}><p>WIRE LAYOUT / 02</p><h1>漆包线排线计算器</h1><span>按层数核算外包尺寸，或按最大边界反推可排层数与根数。</span></header>
    <div className={styles.calculators}>
      <section className={styles.calculator} aria-labelledby="dimensions-title">
        <div className={styles.sectionTitle}><p>正向计算</p><h2 id="dimensions-title">按层数计算尺寸</h2></div>
        <div className={styles.workspace}>
          <div className={styles.inputs}><Field id="layer-diameter" label="含漆膜实际外径 D" unit="mm" value={layerInput.diameter} error={fieldError(layerInput.diameter, layer.errors.diameter)} onChange={setLayer("diameter")} /><Field id="layers" label="垂直层数 M" unit="层" value={layerInput.layers} error={fieldError(layerInput.layers, layer.errors.layers)} onChange={setLayer("layers")} /><Field id="roots" label="水平根数 N" unit="根" value={layerInput.roots} error={fieldError(layerInput.roots, layer.errors.roots)} onChange={setLayer("roots")} /><ModeControl value={layerMode} onChange={setLayerMode} label="排布模式" /></div>
          <div className={styles.output} aria-live="polite"><h3>计算结果</h3>{layer.valid && layer.result ? <><ResultRow label="层间距 Pv" value={layer.result.verticalPitch} /><ResultRow label="水平错位 Offset" value={layer.result.offset} /><ResultRow label="实际高度 H" value={layer.result.height} /><ResultRow label="实际宽度 W" value={layer.result.width} /><ResultRow label="总根数 Total" value={layer.result.total} unit="" /><PackingPreview diameter={parse(layerInput.diameter)} layers={parse(layerInput.layers)} roots={parse(layerInput.roots)} mode={layerMode} /></> : <p className={styles.empty}>请修正输入后计算。</p>}</div>
        </div>
        {layer.warning !== "正常" ? <aside className={styles.warning}>{layer.warning}</aside> : null}
      </section>
      <section className={styles.calculator} aria-labelledby="capacity-title">
        <div className={styles.sectionTitle}><p>反向计算</p><h2 id="capacity-title">按最大尺寸反推</h2></div>
        <div className={styles.workspace}>
          <div className={styles.inputs}><Field id="capacity-diameter" label="含漆膜实际外径 D" unit="mm" value={capacityInput.diameter} error={fieldError(capacityInput.diameter, capacity.errors.diameter)} onChange={setCapacity("diameter")} /><Field id="max-width" label="最大宽度 Wmax" unit="mm" value={capacityInput.maxWidth} error={fieldError(capacityInput.maxWidth, capacity.errors.maxWidth)} onChange={setCapacity("maxWidth")} /><Field id="max-thickness" label="最大厚度 Tmax" unit="mm" value={capacityInput.maxThickness} error={fieldError(capacityInput.maxThickness, capacity.errors.maxThickness)} onChange={setCapacity("maxThickness")} /><ModeControl value={capacityMode} onChange={setCapacityMode} label="排布模式" /></div>
          <div className={styles.output} aria-live="polite"><h3>反推结果</h3>{capacity.valid && capacity.result ? <><ResultRow label="层间距 Pv" value={capacity.result.verticalPitch} /><ResultRow label="垂直层数 M" value={capacity.result.layers} unit="" /><ResultRow label="水平根数 N" value={capacity.result.roots} unit="" /><ResultRow label="实际高度 H" value={capacity.result.height} /><ResultRow label="实际宽度 W" value={capacity.result.width} /><ResultRow label="宽度剩余量" value={capacity.result.remainingWidth} /><ResultRow label="厚度剩余量" value={capacity.result.remainingThickness} /><ResultRow label="总根数 Total" value={capacity.result.total} unit="" /><PackingPreview diameter={parse(capacityInput.diameter)} layers={capacity.result.layers} roots={capacity.result.roots} mode={capacityMode} /></> : <p className={styles.empty}>请修正输入后计算。</p>}</div>
        </div>
        {capacity.warning !== "正常" ? <aside className={styles.warning}>{capacity.warning}</aside> : null}
      </section>
    </div>
    <aside className={styles.assumption}><strong>Excel 假设</strong><span>圆线不压扁，不含张力、漆膜误差、浸漆、工艺余量。</span></aside>
  </main>;
}
