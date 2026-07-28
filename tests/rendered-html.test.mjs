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
  assert.match(home, /工程计算，不必复杂/);
  assert.doesNotMatch(home, /更多工具/);
  assert.equal(home.match(/"@type":"WebSite"/g)?.length, 1);

  assert.match(slotPole, /槽极配生成器/);
  assert.match(wireLayout, /漆包线排线计算器/);
  assert.match(coilResistance, /线圈电阻计算器/);

  for (const [html, title, route] of [
    [slotPole, "槽极配生成器｜中欣工具箱", "/slot-pole"],
    [wireLayout, "漆包线排线计算器｜中欣工具箱", "/wire-layout"],
    [coilResistance, "线圈电阻计算器｜中欣工具箱", "/coil-resistance"],
  ]) {
    assert.equal(html.match(/<title>[^<]+<\/title>/g)?.length, 1);
    assert.match(html, new RegExp(`<title>${title}<\\/title>`));
    assert.match(html, new RegExp(`<link rel="canonical" href="https://zx-toolbox\\.netlify\\.app${route}"`));
  }

  assert.match(slotPole, /<label[^>]*for="slots"[^>]*><span>槽数 Q<\/span>/);
  assert.match(slotPole, /id="slots"[^>]*value="12"/);
  assert.match(slotPole, /id="slots"[^>]*min="3"/);
  assert.match(slotPole, /id="poles"[^>]*value="10"/);
  assert.match(slotPole, /id="poles"[^>]*min="2"/);
  assert.match(wireLayout, /<label[^>]*for="layer-diameter"[^>]*>含漆膜实际外径 D<\/label>/);
  assert.match(wireLayout, /id="layer-diameter"[^>]*value="0\.87"/);
  assert.match(wireLayout, /id="capacity-diameter"[^>]*value="0\.62"/);
  assert.match(coilResistance, /<label[^>]*for="round-wireDiameter"[^>]*>裸线径 d<\/label>/);
  assert.match(coilResistance, /id="round-wireDiameter"[^>]*value="0\.61"/);
  assert.match(coilResistance, /id="motor-wireDiameter"[^>]*value="0\.8"/);
  assert.match(slotPole, /"@type":"WebApplication"/);
  assert.match(wireLayout, /"@type":"WebApplication"/);
  assert.match(coilResistance, /"@type":"WebApplication"/);
  for (const html of [slotPole, wireLayout, coilResistance]) {
    assert.doesNotMatch(html, /"@type":"WebSite"/);
  }

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
