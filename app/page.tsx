"use client";

import { useMemo, useState } from "react";
import SeoContent from "./SeoContent";
import { generateWinding } from "./winding.js";

const PHASE_CLASS: Record<string, string> = {
  A: "phase-a", U: "phase-a",
  B: "phase-b", V: "phase-b",
  C: "phase-c", W: "phase-c",
};

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint: string;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        min="3"
        max="120"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>{hint}</small>
    </label>
  );
}

export default function Home() {
  const [slots, setSlots] = useState(12);
  const [poles, setPoles] = useState(10);
  const [notation, setNotation] = useState<"ABC" | "UVW">("ABC");
  const [swapBC, setSwapBC] = useState(false);

  const winding = useMemo(
    () => generateWinding({ slots, poles, notation, swapBC }),
    [slots, poles, notation, swapBC],
  );

  const resetExample = () => {
    setSlots(12);
    setPoles(10);
    setNotation("ABC");
    setSwapBC(false);
  };

  return (
    <main className="site-shell">
      <header className="masthead">
        <div>
          <p className="kicker">三相双层绕组</p>
          <h1>槽极配与线圈接线表</h1>
          <p className="intro">输入槽数和总极数，即时生成与原工作簿一致的线圈接线表。</p>
        </div>
        <button className="secondary-button" type="button" onClick={resetExample}>恢复示例</button>
      </header>

      <section className="workspace" aria-label="绕组计算器">
        <aside className="control-panel">
          <div className="panel-heading">
            <h2>输入参数</h2>
            <p>仅需设置槽数 Q、总极数 P。</p>
          </div>

          <div className="fields">
            <NumberField id="slots" label="槽数 Q" value={slots} onChange={setSlots} hint="3 至 120 的整数，且须为 3 的倍数" />
            <NumberField id="poles" label="总极数 P" value={poles} onChange={setPoles} hint="2 至 120 的偶数" />

            <fieldset className="field choice-field">
              <legend>相别显示</legend>
              <div className="segmented-control">
                {(["ABC", "UVW"] as const).map((option) => (
                  <button
                    key={option}
                    className={notation === option ? "selected" : ""}
                    type="button"
                    onClick={() => setNotation(option)}
                    aria-pressed={notation === option}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="switch-row" htmlFor="swap-bc">
              <span>
                <strong>BC 相互换</strong>
                <small>交换 B/C 或 V/W 的相别标签</small>
              </span>
              <input
                id="swap-bc"
                type="checkbox"
                checked={swapBC}
                onChange={(event) => setSwapBC(event.target.checked)}
              />
            </label>
          </div>

          <div className={`status-card ${winding.valid ? "is-valid" : "is-invalid"}`} aria-live="polite">
            <span>生成状态</span>
            <strong>{winding.valid ? "可生成" : "请检查 Q / P"}</strong>
            <p>{winding.valid ? `推荐节距 y = ${winding.recommendedPitch}` : "Q 须为 3 的倍数，P 须为偶数。"}</p>
          </div>
        </aside>

        <section className="result-panel" aria-label="计算结果">
          <div className="result-heading">
            <div>
              <h2>线圈接线表</h2>
              <p>{winding.valid ? `共 ${winding.rows.length} 个线圈，节距 y = ${winding.recommendedPitch}` : "请先修正输入参数。"}</p>
            </div>
            <div className="phase-key" aria-label="相别颜色说明">
              {winding.connections.map(({ displayPhase }) => (
                <span key={displayPhase} className={PHASE_CLASS[displayPhase]}>{displayPhase} 相</span>
              ))}
            </div>
          </div>

          {winding.valid ? (
            <div className="table-wrap" tabIndex={0} aria-label="线圈接线结果表，可横向滚动">
              <table>
                <thead>
                  <tr>
                    <th>线圈</th><th>上层槽</th><th>下层槽</th><th>相别</th><th>上层标记</th><th>下层标记</th><th>接线标记</th><th>组极性</th><th>线圈电角°</th><th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {winding.rows.map((row) => (
                    <tr key={row.coil}>
                      <td>{row.coil}</td><td>{row.upperSlot}</td><td>{row.lowerSlot}</td>
                      <td><span className={`phase-chip ${PHASE_CLASS[row.displayPhase]}`}>{row.displayPhase}</span></td>
                      <td>{row.upperMark}</td><td>{row.lowerMark}</td><td className="connection-cell">{row.connection}</td>
                      <td>{row.polarity}</td><td>{row.electricalAngle}</td><td><span className="ok-label">OK</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">输入有效的 Q 和 P 后显示完整接线表。</div>
          )}
        </section>
      </section>

      <section className="connection-section" aria-labelledby="connection-title">
        <div className="section-title">
          <h2 id="connection-title">三相串联与端子</h2>
          <p>同相正负组串联，端子命名与工作簿一致。</p>
        </div>
        <div className="connection-grid">
          {winding.connections.map((connection) => (
            <article className={`connection-card ${PHASE_CLASS[connection.displayPhase]}`} key={connection.phase}>
              <span className="connection-phase">{connection.displayPhase} 相</span>
              <strong>{connection.rule}</strong>
              <span className="terminal">{connection.terminal}</span>
            </article>
          ))}
        </div>
      </section>

      <SeoContent />
    </main>
  );
}
