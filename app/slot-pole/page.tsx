"use client";

import { useMemo, useState } from "react";
import SeoContent from "../SeoContent";
import WindingDiagram from "../WindingDiagram";
import { generateWinding } from "../winding.js";

const PHASE_CLASS: Record<string, string> = {
  A: "phase-a", U: "phase-a",
  B: "phase-b", V: "phase-b",
  C: "phase-c", W: "phase-c",
};

function NumberField({
  id,
  label,
  value,
  min,
  max = 120,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
  hint: string;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
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
  const [pitch, setPitch] = useState(1);
  const [parallelBranches, setParallelBranches] = useState(1);
  const [notation, setNotation] = useState<"ABC" | "UVW">("ABC");
  const [swapBC, setSwapBC] = useState(false);

  const winding = useMemo(
    () => generateWinding({ slots, poles, pitch, parallelBranches, notation, swapBC }),
    [slots, poles, pitch, parallelBranches, notation, swapBC],
  );

  const resetExample = () => {
    setSlots(12);
    setPoles(10);
    setPitch(1);
    setParallelBranches(1);
    setNotation("ABC");
    setSwapBC(false);
  };

  return (
    <main className="site-shell">
      <header className="masthead">
        <h1>槽极配生成器</h1>
        <button className="secondary-button" type="button" onClick={resetExample}>恢复示例</button>
      </header>

      <section className="workspace" aria-label="绕组计算器">
        <aside className="control-panel">
          <div className="panel-heading">
            <h2>输入参数</h2>
            <p>设置槽数 Q、总极数 P 和节距 y，再选择每相并联支路。</p>
          </div>

          <div className="fields">
            <NumberField id="slots" label="槽数 Q" value={slots} min={3} onChange={(value) => { setSlots(value); setParallelBranches(1); }} hint="3 至 120 的整数，且须为 3 的倍数" />
            <NumberField id="poles" label="总极数 P" value={poles} min={2} onChange={(value) => { setPoles(value); setParallelBranches(1); }} hint="2 至 120 的偶数" />
            <NumberField id="pitch" label="节距 y" value={pitch} min={1} max={Math.max(1, slots - 1)} onChange={(value) => { setPitch(value); setParallelBranches(1); }} hint="1 至 Q−1 的整数，表示同一线圈两有效边的槽间距" />

            <label className="field" htmlFor="parallel-branches">
              <span>每相并联支路 a</span>
              <select
                id="parallel-branches"
                value={winding.parallelBranches}
                disabled={!winding.valid}
                onChange={(event) => setParallelBranches(Number(event.target.value))}
              >
                {winding.valid ? winding.parallelOptions.map((count) => (
                  <option key={count} value={count}>
                    {count === 1 ? "1（全部串联）" : `${count}（每相 ${count} 路并联）`}
                  </option>
                )) : <option value={1}>请先输入有效的 Q / P / y</option>}
              </select>
              <small>按同匝数、同线径和对称磁场下的等效线圈组合计算；每条支路内部串联。</small>
            </label>

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
            <strong>{winding.valid ? (winding.balanced ? "可生成" : "三相不对称") : "请检查 Q / P / y"}</strong>
            <p>{winding.valid ? `当前节距 y = ${winding.pitch}；推荐节距 y = ${winding.recommendedPitch}` : winding.error}</p>
            {winding.warning && <p role="status">{winding.warning}</p>}
          </div>
        </aside>

        <section className="result-panel" aria-label="计算结果">
          <div className="result-heading">
            <div>
              <h2>线圈接线表</h2>
              <p>{winding.valid ? `共 ${winding.rows.length} 个线圈，节距 y = ${winding.pitch}，每相 ${winding.parallelBranches} 路${winding.parallelBranches === 1 ? "（全部串联）" : "并联"}` : "请先修正输入参数。"}</p>
            </div>
            <div className="phase-key" aria-label="相别颜色说明">
              {winding.connections.map(({ displayPhase }) => (
                <span key={displayPhase} className={PHASE_CLASS[displayPhase]}>{displayPhase} 相</span>
              ))}
            </div>
          </div>

          {winding.valid ? (
            <div className="table-wrap" tabIndex={0} aria-label="线圈接线结果表，可横向滚动">
              <table className="winding-table">
                <thead>
                  <tr>
                    <th>线圈</th><th>相别</th><th>线圈标记</th><th>槽对</th><th>组极性</th><th>线圈电角°</th><th>支路</th><th>路内顺序</th>
                  </tr>
                </thead>
                <tbody>
                  {winding.rows.map((row) => (
                    <tr key={row.coil}>
                      <td>{row.coil}</td>
                      <td><span className={`phase-chip ${PHASE_CLASS[row.displayPhase]}`}>{row.displayPhase}</span></td>
                      <td>{row.upperMark}</td>
                      <td>{row.upperSlot} / {row.lowerSlot}</td>
                      <td>{row.polarity}</td><td>{row.electricalAngle}</td>
                      <td>{row.displayPhase}{row.branch}</td><td>{row.branchOrder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">输入有效的 Q、P 和 y 后显示完整接线表。</div>
          )}
        </section>
        <WindingDiagram key={`${slots}:${poles}:${pitch}:${winding.parallelBranches}`} winding={winding} />
      </section>

      <section className="connection-section" aria-labelledby="connection-title">
        <div className="section-title">
          <h2 id="connection-title">三相支路接线与端子</h2>
          <p>各支路内部按极性串联，同相各支路首末端分别并接；U2/V2/W2 汇入中性点 N。</p>
        </div>
        <div className="connection-grid">
          {winding.connections.map((connection) => (
            <article className={`connection-card ${PHASE_CLASS[connection.displayPhase]}`} key={connection.phase}>
              <span className="connection-phase">{connection.displayPhase} 相</span>
              <strong>{connection.rule}</strong>
              {connection.branches.map(({ branch, coils }) => (
                <span className="branch-sequence" key={branch}>
                  支路 {connection.displayPhase}{branch}：{coils.map((coil) => `${coil.coil}(${coil.upperMark})`).join(" → ")}
                </span>
              ))}
              <span className="terminal">{connection.terminal}</span>
            </article>
          ))}
        </div>
      </section>

      <SeoContent />
    </main>
  );
}
