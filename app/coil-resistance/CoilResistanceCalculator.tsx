"use client";

import { useMemo, useState } from "react";
import {
  COIL_MATERIALS,
  calculateMotorCoil,
  calculateRoundCoil,
  formatLength,
  formatResistance,
  formatWeight,
} from "./coil-resistance.js";
import {
  buildMotorExportRows,
  buildRoundExportRows,
  exportCoilCalculation,
  isExportableCoilCalculation,
} from "./coil-export.js";
import styles from "./coil-resistance.module.css";

type FormValues = Record<string, string>;

const roundDefaults: FormValues = {
  material: "copper",
  wireDiameter: "",
  outerDiameter: "",
  innerDiameter: "",
  turns: "",
};

const motorDefaults: FormValues = {
  material: "copper",
  wireDiameter: "",
  outerLength: "",
  outerWidth: "",
  innerLength: "",
  innerWidth: "",
  turns: "",
  branchesPerPhase: "",
  coilsPerBranch: "",
};

const roundFields = [
  ["wireDiameter", "裸线径 d", "mm"],
  ["outerDiameter", "最外圈直径", "mm"],
  ["innerDiameter", "最内圈直径", "mm"],
  ["turns", "匝数", "匝"],
] as const;

const motorFields = [
  ["wireDiameter", "裸线径 d", "mm"],
  ["outerLength", "最外圈长", "mm"],
  ["outerWidth", "最外圈宽", "mm"],
  ["innerLength", "最内圈长", "mm"],
  ["innerWidth", "最内圈宽", "mm"],
  ["turns", "匝数", "匝"],
  ["branchesPerPhase", "每相支路数", "支路"],
  ["coilsPerBranch", "每支路线圈数", "线圈"],
] as const;

function parse(values: FormValues) {
  const { material, ...numericValues } = values;
  return {
    material,
    ...Object.fromEntries(
      Object.entries(numericValues).map(([key, value]) => [
        key,
        value.trim() === "" ? Number.NaN : Number(value),
      ]),
    ),
  };
}

function MaterialField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>线圈材料</label>
      <div className={styles.inputWithUnit}>
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
          {Object.entries(COIL_MATERIALS).map(([material, definition]) => (
            <option key={material} value={material}>{definition.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Field({ id, label, unit, value, error, onChange }: {
  id: string;
  label: string;
  unit: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputWithUnit}>
        <input id={id} value={value} inputMode="decimal" onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />
        <span>{unit}</span>
      </div>
      {error && <p id={errorId} className={styles.error}>{error}</p>}
    </div>
  );
}

function ResultRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div className={styles.resultRow}><span>{label}</span><strong>{value}</strong><small>{unit}</small></div>;
}

export default function CoilResistanceCalculator() {
  const [roundValues, setRoundValues] = useState(roundDefaults);
  const [motorValues, setMotorValues] = useState(motorDefaults);
  const [roundTouched, setRoundTouched] = useState(false);
  const [motorTouched, setMotorTouched] = useState(false);
  const [roundExportError, setRoundExportError] = useState("");
  const [motorExportError, setMotorExportError] = useState("");
  const round = useMemo(() => calculateRoundCoil(parse(roundValues)), [roundValues]);
  const motor = useMemo(() => calculateMotorCoil(parse(motorValues)), [motorValues]);

  const update = (setValues: React.Dispatch<React.SetStateAction<FormValues>>, setTouched: React.Dispatch<React.SetStateAction<boolean>>, name: string, value: string) => {
    setTouched(true);
    setValues((current) => ({ ...current, [name]: value }));
  };

  const exportRound = async () => {
    setRoundExportError(await exportCoilCalculation({
      calculation: round,
      input: parse(roundValues),
      sheetName: "圆形线圈",
      buildRows: buildRoundExportRows,
    }));
  };

  const exportMotor = async () => {
    setMotorExportError(await exportCoilCalculation({
      calculation: motor,
      input: parse(motorValues),
      sheetName: "矩形线圈",
      buildRows: buildMotorExportRows,
    }));
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>电机工程计算</p>
        <h1>线圈电阻计算器</h1>
        <p>根据线圈几何尺寸和材料，计算铜线或铝线的电阻与重量。</p>
      </header>

      <section className={styles.calculator} aria-labelledby="round-title">
        <div className={styles.inputPanel}>
          <h2 id="round-title">圆形线圈</h2>
          <p>输入材料、尺寸与匝数，计算单线圈线材长度、电阻和重量。</p>
          <div className={styles.fields}>
            <MaterialField id="round-material" value={roundValues.material} onChange={(value) => update(setRoundValues, setRoundTouched, "material", value)} />
            {roundFields.map(([name, label, unit]) => <Field key={name} id={`round-${name}`} label={label} unit={unit} value={roundValues[name]} error={roundTouched ? round.errors[name] : undefined} onChange={(value) => update(setRoundValues, setRoundTouched, name, value)} />)}
          </div>
        </div>
        <section className={styles.resultPanel} aria-label="圆形线圈计算结果" aria-live="polite">
          <div className={styles.resultHeader}>
            <h2>计算结果</h2>
            <button className={styles.exportButton} type="button" onClick={exportRound} disabled={!isExportableCoilCalculation(round)}>
              导出 Excel
            </button>
          </div>
          {roundExportError && <p className={styles.exportError} role="alert">{roundExportError}</p>}
          {!roundTouched ? <p className={styles.empty}>请输入线圈参数后显示计算结果。</p> : round.valid && round.result ? <>
            <ResultRow label="单线圈线材长度" value={formatLength(round.result.length)} unit="mm" />
            <ResultRow label="截面积" value={formatResistance(round.result.area)} unit="mm²" />
            <ResultRow label="单线圈电阻" value={formatResistance(round.result.resistance)} unit="Ω" />
            <ResultRow label="单线圈重量" value={formatWeight(round.result.coilWeight)} unit="kg" />
          </> : <p className={styles.invalid}>请修正标记字段后显示计算结果。</p>}
        </section>
      </section>

      <section className={styles.calculator} aria-labelledby="motor-title">
        <div className={styles.inputPanel}>
          <h2 id="motor-title">矩形线圈</h2>
          <p>按矩形匝长及三相支路关系计算电阻和线圈重量。</p>
          <div className={styles.fields}>
            <MaterialField id="motor-material" value={motorValues.material} onChange={(value) => update(setMotorValues, setMotorTouched, "material", value)} />
            {motorFields.map(([name, label, unit]) => <Field key={name} id={`motor-${name}`} label={label} unit={unit} value={motorValues[name]} error={motorTouched ? motor.errors[name] : undefined} onChange={(value) => update(setMotorValues, setMotorTouched, name, value)} />)}
          </div>
        </div>
        <section className={styles.resultPanel} aria-label="矩形线圈计算结果" aria-live="polite">
          <div className={styles.resultHeader}>
            <h2>计算结果</h2>
            <button className={styles.exportButton} type="button" onClick={exportMotor} disabled={!isExportableCoilCalculation(motor)}>
              导出 Excel
            </button>
          </div>
          {motorExportError && <p className={styles.exportError} role="alert">{motorExportError}</p>}
          {!motorTouched ? <p className={styles.empty}>请输入线圈参数后显示计算结果。</p> : motor.valid && motor.result ? <>
            <ResultRow label="单线圈线材长度" value={formatLength(motor.result.length)} unit="mm" />
            <ResultRow label="截面积" value={formatResistance(motor.result.area)} unit="mm²" />
            <ResultRow label="单线圈电阻" value={formatResistance(motor.result.coilResistance)} unit="Ω" />
            <ResultRow label="单相电阻" value={formatResistance(motor.result.phaseResistance)} unit="Ω" />
            <ResultRow label="P-P 电阻" value={formatResistance(motor.result.lineToLineResistance)} unit="Ω" />
            <ResultRow label="单线圈重量" value={formatWeight(motor.result.coilWeight)} unit="kg" />
            <ResultRow label="整台三相电机线圈重量" value={formatWeight(motor.result.totalWeight)} unit="kg" />
          </> : <p className={styles.invalid}>请修正标记字段后显示计算结果。</p>}
        </section>
      </section>
    </main>
  );
}
