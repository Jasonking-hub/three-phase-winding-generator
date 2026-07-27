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
