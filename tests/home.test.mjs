import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TOOL_REGISTRY } from "../app/tools.js";

const homePageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const railSource = readFileSync(new URL("../app/HomeToolRail.tsx", import.meta.url), "utf8");
const homeCssSource = readFileSync(new URL("../app/home.module.css", import.meta.url), "utf8");
const globalCssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("publishes complete, ordered, uniquely routed home tools", () => {
  assert.deepEqual(
    TOOL_REGISTRY.map(({ id, href, visual }) => ({ id, href, visual })),
    [
      { id: "slot-pole", href: "/slot-pole", visual: "slotPole" },
      { id: "wire-layout", href: "/wire-layout", visual: "wirePacking" },
      { id: "coil-resistance", href: "/coil-resistance", visual: "resistance" },
    ],
  );

  for (const [position, tool] of TOOL_REGISTRY.entries()) {
    assert.deepEqual(Object.keys(tool).sort(), ["description", "href", "id", "index", "name", "visual"]);
    assert.equal(tool.index, position + 1);
    assert.ok(tool.name.trim());
    assert.ok(tool.description.trim());
  }

  assert.equal(new Set(TOOL_REGISTRY.map(({ href }) => href)).size, TOOL_REGISTRY.length);

  const coilTool = TOOL_REGISTRY.find(({ id }) => id === "coil-resistance");
  assert.equal(coilTool.description, "计算圆形与矩形铜/铝线圈的电阻和重量。");
});

test("uses a concise homepage with a responsive three-state tool rail", () => {
  assert.doesNotMatch(homePageSource, /heroCopy/);
  assert.match(homePageSource, /<h1 id="home-title">中欣工具箱<\/h1>/);
  assert.match(homePageSource, /<p className=\{styles\.heroSubtitle\}>工程计算，不必复杂<\/p>/);
  assert.doesNotMatch(homePageSource, /moreTools/);
  assert.doesNotMatch(homePageSource, /更多工具/);
  assert.doesNotMatch(homePageSource, /槽极配、漆包线排线与线圈电阻，一处进入。/);
  assert.doesNotMatch(homePageSource, /持续扩展/);
  assert.doesNotMatch(homePageSource, /后续将围绕电机设计与制造中的常用计算持续补充工具。/);
  assert.match(railSource, /data-active-id=\{activeId\}/);
  assert.match(homeCssSource, /grid-template-columns:\s*2\.2fr 1fr 1fr/);
  assert.match(homeCssSource, /--home-bg:\s*#f2f0ec/);
  assert.match(homeCssSource, /--home-accent:\s*#775b3e/);
  assert.match(homeCssSource, /--home-ease-out:\s*cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  assert.match(homeCssSource, /\.hero h1\s*\{[^}]*color:\s*var\(--home-ink\)/);
  assert.match(homeCssSource, /grid-template-columns 420ms var\(--home-ease-out\)/);
  assert.match(homeCssSource, /opacity 260ms var\(--home-ease-out\)/);
  assert.doesNotMatch(homeCssSource, /650ms/);
  assert.doesNotMatch(homeCssSource, /background:\s*var\(--color-ink/);
  assert.match(homeCssSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(globalCssSource, /\.site-header\s*\{[\s\S]*?backdrop-filter:\s*blur\(18px\) saturate\(150%\)/);
  assert.match(globalCssSource, /prefers-reduced-transparency:\s*reduce/);
  assert.match(globalCssSource, /prefers-contrast:\s*more/);
});

test("keeps all rail states, content layers, and mobile fallback accessible", () => {
  assert.match(railSource, /aria-label=\{`\$\{tool\.name\}：\$\{tool\.description\}`\}/);
  assert.match(railSource, /className=\{styles\.toolFullContent\}\s+aria-hidden="true"/);
  assert.match(railSource, /className=\{styles\.toolCompactTitle\}\s+aria-hidden="true"/);
  assert.match(homeCssSource, /\.toolRail\[data-active-id="wire-layout"\]\s*\{\s*grid-template-columns:\s*1fr 2\.2fr 1fr/);
  assert.match(homeCssSource, /\.toolRail\[data-active-id="coil-resistance"\]\s*\{\s*grid-template-columns:\s*1fr 1fr 2\.2fr/);
  assert.match(homeCssSource, /@media \(max-width: 1023px\) \{[\s\S]*?\.toolRail\[data-active-id="wire-layout"\],[\s\S]*?\.toolRail\[data-active-id="coil-resistance"\]\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(homeCssSource, /\.toolFullContent\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*translateY\(0\)/);
  assert.match(homeCssSource, /\.toolCard:not\(\[data-active="true"\]\) \.toolFullContent\s*\{\s*opacity:\s*0;\s*transform:\s*translateY\(4px\)/);
  assert.match(homeCssSource, /\.toolCard:not\(\[data-active="true"\]\) \.toolCompactTitle\s*\{\s*opacity:\s*1;\s*transform:\s*translateY\(0\)/);
  assert.doesNotMatch(homeCssSource, /\.kicker,/);
  assert.match(homeCssSource, /\.toolCard\s*\{\s*min-height:\s*144px;\s*display:\s*grid;/);
});
