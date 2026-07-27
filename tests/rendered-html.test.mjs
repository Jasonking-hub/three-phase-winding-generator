import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const OUTPUT_ROOT = path.resolve("dist/client");

async function readRoute(route) {
  const candidates = route === "/"
    ? ["index.html"]
    : [`${route.slice(1)}.html`, `${route.slice(1)}/index.html`];
  for (const relative of candidates) {
    try {
      return await readFile(path.join(OUTPUT_ROOT, relative), "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  throw new Error(`Missing static route: ${route}`);
}

test("static export exposes the toolbox home and all three calculators", async () => {
  const [home, slotPole, wireLayout, coilResistance] = await Promise.all([
    readRoute("/"),
    readRoute("/slot-pole"),
    readRoute("/wire-layout"),
    readRoute("/coil-resistance"),
  ]);

  assert.match(home, />中欣工具箱<\/h1>/);
  assert.match(home, /href="\/slot-pole"/);
  assert.match(home, /href="\/wire-layout"/);
  assert.match(home, /href="\/coil-resistance"/);
  assert.match(home, /更多工具/);

  assert.match(slotPole, /槽极配生成器/);
  assert.match(wireLayout, /漆包线排线计算器/);
  assert.match(coilResistance, /线圈电阻计算器/);
  assert.match(slotPole, /"@type":"WebApplication"/);
  assert.match(wireLayout, /"@type":"WebApplication"/);
  assert.match(coilResistance, /"@type":"WebApplication"/);

  for (const html of [home, slotPole, wireLayout, coilResistance]) {
    assert.doesNotMatch(html, /three-phase-winding-generator\.netlify\.app/);
    assert.doesNotMatch(html, /(?:NaN|Infinity|#DIV\/0!|#REF!)/);
  }
});

test("static export publishes the new canonical crawl files", async () => {
  const [robots, sitemap] = await Promise.all([
    readFile(path.join(OUTPUT_ROOT, "robots.txt"), "utf8"),
    readFile(path.join(OUTPUT_ROOT, "sitemap.xml"), "utf8"),
  ]);
  assert.match(robots, /https:\/\/zx-toolbox\.netlify\.app\/sitemap\.xml/);
  for (const route of ["", "/slot-pole", "/wire-layout", "/coil-resistance"]) {
    assert.match(sitemap, new RegExp(`<loc>https://zx-toolbox\\.netlify\\.app${route}<\\/loc>`));
  }
});
