import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TOOL_REGISTRY } from "../app/tools.js";

const homePageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const railSource = readFileSync(new URL("../app/HomeToolRail.tsx", import.meta.url), "utf8");
const homeCssSource = readFileSync(new URL("../app/home.module.css", import.meta.url), "utf8");

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
});

test("uses a full-width three-state grid rail with reduced-motion fallback", () => {
  assert.doesNotMatch(homePageSource, /heroCopy/);
  assert.match(homePageSource, /<h1 id="home-title">中欣工具箱<\/h1>/);
  assert.match(railSource, /data-active-id=\{activeId\}/);
  assert.match(homeCssSource, /grid-template-columns:\s*2\.2fr 1fr 1fr/);
  assert.match(homeCssSource, /650ms cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
  assert.match(homeCssSource, /prefers-reduced-motion:\s*reduce/);
});

test("keeps all rail states, content layers, and mobile fallback accessible", () => {
  assert.match(railSource, /aria-label=\{`\$\{tool\.name\}：\$\{tool\.description\}`\}/);
  assert.match(railSource, /className=\{styles\.toolFullContent\}\s+aria-hidden="true"/);
  assert.match(railSource, /className=\{styles\.toolCompactTitle\}\s+aria-hidden="true"/);
  assert.match(homeCssSource, /\.toolRail\[data-active-id="wire-layout"\]\s*\{\s*grid-template-columns:\s*1fr 2\.2fr 1fr/);
  assert.match(homeCssSource, /\.toolRail\[data-active-id="coil-resistance"\]\s*\{\s*grid-template-columns:\s*1fr 1fr 2\.2fr/);
  assert.match(homeCssSource, /@media \(max-width: 1023px\) \{[\s\S]*?\.toolRail\[data-active-id="wire-layout"\],[\s\S]*?\.toolRail\[data-active-id="coil-resistance"\]\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(homeCssSource, /\.toolFullContent\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*translateY\(0\)/);
  assert.match(homeCssSource, /\.toolCard:not\(\[data-active="true"\]\) \.toolFullContent\s*\{\s*opacity:\s*0;\s*transform:\s*translateY\(6px\)/);
  assert.match(homeCssSource, /\.toolCard:not\(\[data-active="true"\]\) \.toolCompactTitle\s*\{\s*opacity:\s*1;\s*transform:\s*translateY\(0\)/);
  assert.doesNotMatch(homeCssSource, /\.kicker,/);
  assert.match(homeCssSource, /\.toolCard\s*\{\s*min-height:\s*144px;\s*display:\s*grid;/);
});
