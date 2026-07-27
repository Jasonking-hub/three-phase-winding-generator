"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { TOOL_REGISTRY } from "./tools.js";
import styles from "./home.module.css";

function ToolVisual({ visual }: { visual: string }) {
  if (visual === "slotPole") {
    return <span className={styles.slotPoleVisual} aria-hidden="true">Q : P</span>;
  }

  if (visual === "wirePacking") {
    return (
      <svg
        aria-hidden="true"
        className={styles.wirePackingVisual}
        viewBox="-1 -1 62 57"
      >
        <line className={styles.wireBoundary} x1="0" y1="0" x2="0" y2="54.641016" />
        <line className={styles.wireBoundary} x1="0" y1="54.641016" x2="60" y2="54.641016" />
        <g className={styles.wireCircles}>
          <circle cx="10" cy="10" r="10" />
          <circle cx="30" cy="10" r="10" />
          <circle cx="50" cy="10" r="10" />
          <circle cx="20" cy="27.320508" r="10" />
          <circle cx="40" cy="27.320508" r="10" />
          <circle cx="10" cy="44.641016" r="10" />
          <circle cx="30" cy="44.641016" r="10" />
          <circle cx="50" cy="44.641016" r="10" />
        </g>
      </svg>
    );
  }

  return (
    <span className={styles.resistanceVisual} aria-hidden="true">
      <strong>Ω</strong>
      <small><i>ρL</i><b>A</b></small>
    </span>
  );
}

export default function HomeToolRail() {
  const [activeId, setActiveId] = useState("slot-pole");

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <section className={styles.toolSection} aria-labelledby="tool-rail-title">
      <p className={styles.sectionEyebrow}>核心计算索引</p>
      <h2 id="tool-rail-title">从工程条件进入计算</h2>
      <div className={styles.toolRail}>
        {TOOL_REGISTRY.map((tool) => {
          const isActive = activeId === tool.id;
          return (
            <Link
              className={styles.toolCard}
              data-active={isActive}
              href={tool.href}
              key={tool.id}
              onFocus={() => setActiveId(tool.id)}
              onKeyDown={handleKeyDown}
              onPointerEnter={() => setActiveId(tool.id)}
            >
              <span className={styles.toolIndex}>{String(tool.index).padStart(2, "0")}</span>
              <ToolVisual visual={tool.visual} />
              <span className={styles.toolContent}>
                <strong>{tool.name}</strong>
                <span>{tool.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
