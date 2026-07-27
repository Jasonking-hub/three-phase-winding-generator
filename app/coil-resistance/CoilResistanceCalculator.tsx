"use client";

import { useMemo, useState } from "react";
import {
  calculateMotorCoil,
  calculateRoundCoil,
  formatLength,
  formatResistance,
} from "./coil-resistance.js";
import styles from "./coil-resistance.module.css";

type FormValues = Record<string, string>;

const roundDefaults: FormValues = {
  wireDiameter: "0.61",
  outerDiameter: "71.8",
  innerDiameter: "65.2",
  turns: "228",
};

const motorDefaults: FormValues = {
  wireDiameter: "0.8",
  outerLength: "158",
  outerWidth: "23.5",
  innerLength: "140",
  innerWidth: "5.5",
  turns: "44",
  resistivity: "17.24",
  branchesPerPhase: "1",
  coilsPerBranch: "1",
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
  ["resistivity", "铜线电阻率", "μΩ·mm"],
  ["branchesPerPhase", "每相支路数", "支路"],
  ["coilsPerBranch", "每支路线圈数", "线圈"],
] as const;

function parse(values: FormValues) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() === "" ? Number.NaN : Number(value)]));
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
  const round = useMemo(() => calculateRoundCoil(parse(roundValues)), [roundValues]);
  const motor = useMemo(() => calculateMotorCoil(parse(motorValues)), [motorValues]);

  const update = (setValues: React.Dispatch<React.SetStateAction<FormValues>>, name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>电机工程计算</p>
        <h1>线圈电阻计算器</h1>
        <p>按工作簿固定常量计算圆形线圈与电机线圈的铜线电阻。</p>
      </header>

      <section className={styles.calculator} aria-labelledby="round-title">
        <div className={styles.inputPanel}>
          <h2 id="round-title">圆形线圈</h2>
          <p>输入尺寸与匝数，计算单线圈铜线长度和电阻。</p>
          <div className={styles.fields}>
            {roundFields.map(([name, label, unit]) => <Field key={name} id={`round-${name}`} label={label} unit={unit} value={roundValues[name]} error={round.errors[name]} onChange={(value) => update(setRoundValues, name, value)} />)}
          </div>
        </div>
        <section className={styles.resultPanel} aria-label="圆形线圈计算结果" aria-live="polite">
          <h2>计算结果</h2>
          {round.valid && round.result ? <>
            <ResultRow label="铜线长度" value={formatLength(round.result.length)} unit="mm" />
            <ResultRow label="截面积" value={formatResistance(round.result.area)} unit="mm²" />
            <ResultRow label="单线圈电阻" value={formatResistance(round.result.resistance)} unit="Ω" />
          </> : <p className={styles.invalid}>请修正标记字段后显示计算结果。</p>}
        </section>
      </section>

      <section className={styles.calculator} aria-labelledby="motor-title">
        <div className={styles.inputPanel}>
          <h2 id="motor-title">电机线圈</h2>
          <p>采用矩形匝长与对称星形接法的电阻关系。</p>
          <div className={styles.fields}>
            {motorFields.map(([name, label, unit]) => <Field key={name} id={`motor-${name}`} label={label} unit={unit} value={motorValues[name]} error={motor.errors[name]} onChange={(value) => update(setMotorValues, name, value)} />)}
          </div>
        </div>
        <section className={styles.resultPanel} aria-label="电机线圈计算结果" aria-live="polite">
          <h2>计算结果</h2>
          {motor.valid && motor.result ? <>
            <ResultRow label="铜线长度" value={formatLength(motor.result.length)} unit="mm" />
            <ResultRow label="截面积" value={formatResistance(motor.result.area)} unit="mm²" />
            <ResultRow label="单线圈电阻" value={formatResistance(motor.result.coilResistance)} unit="Ω" />
            <ResultRow label="单相电阻" value={formatResistance(motor.result.phaseResistance)} unit="Ω" />
            <ResultRow label="P-P 电阻" value={formatResistance(motor.result.lineToLineResistance)} unit="Ω" />
          </> : <p className={styles.invalid}>请修正标记字段后显示计算结果。</p>}
        </section>
      </section>

      <aside className={styles.notes} aria-label="计算假设">
        <p>未自动增加引出线、跨接线或接头长度。</p>
        <p>P-P 保留三相对称星形接法假设。</p>
      </aside>
    </main>
  );
}
