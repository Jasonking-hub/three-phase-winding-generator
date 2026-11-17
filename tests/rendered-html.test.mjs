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
  assert.match(coilResistance, /矩形线圈/);
  assert.doesNotMatch(coilResistance, /计算假设/);

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
  assert.match(slotPole, /id="pitch"[^>]*value="1"/);
  assert.match(slotPole, /id="pitch"[^>]*max="11"/);
  assert.match(slotPole, /<select[^>]*id="parallel-branches"/);
  assert.match(slotPole, /<option value="1" selected="">1（全部串联）<\/option>/);
  assert.match(slotPole, /<option value="2">2（每相 2 路并联）<\/option>/);
  assert.match(slotPole, /图形宽度不代表节距/);
  assert.match(slotPole, /<th>支路<\/th>/);
  assert.match(wireLayout, /<label[^>]*for="layer-diameter"[^>]*>含漆膜实际外径 D<\/label>/);
  assert.match(wireLayout, /id="layer-diameter"[^>]*value="0\.87"/);
  assert.match(wireLayout, /id="capacity-diameter"[^>]*value="0\.62"/);
  assert.match(coilResistance, /<label[^>]*for="round-wireDiameter"[^>]*>单根裸线径 d<\/label>/);
  for (const id of ['round-parallelWires', 'motor-parallelWires', 'round-branchesPerPhase', 'round-coilsPerBranch']) {
    assert.match(coilResistance, new RegExp(`<input[^>]*id="${id}"[^>]*value="1"`));
  }
  for (const prefix of ['round', 'motor']) {
    assert.match(coilResistance, new RegExp(`<label[^>]*for="${prefix}-parallelWires"[^>]*>并绕根数<\\/label>`));
    assert.match(coilResistance, new RegExp(`<label[^>]*for="${prefix}-branchesPerPhase"[^>]*>每相并联支路数<\\/label>`));
  }
  for (const id of [
    "round-wireDiameter",
    "round-outerDiameter",
    "round-innerDiameter",
    "round-turns",
    "motor-wireDiameter",
    "motor-outerLength",
    "motor-outerWidth",
    "motor-innerLength",
    "motor-innerWidth",
    "motor-turns",
    "motor-branchesPerPhase",
    "motor-coilsPerBranch",
  ]) {
    assert.match(coilResistance, new RegExp(`<input[^>]*id="${id}"[^>]*value=""`));
  }
  assert.match(coilResistance, /<select[^>]*id="round-material"/);
  assert.match(coilResistance, /<select[^>]*id="motor-material"/);
  assert.equal(
    coilResistance.match(/<option value="copper" selected="">铜线<\/option>/g)?.length,
    2,
  );
  assert.ok(
    (coilResistance.match(/<option value="aluminum">铝线<\/option>/g)?.length ?? 0) >= 2,
  );
  assert.ok(
    (coilResistance.match(/请输入线圈参数后显示计算结果。/g)?.length ?? 0) >= 2,
  );
  assert.doesNotMatch(coilResistance, /铜线电阻率/);
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
