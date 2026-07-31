import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { SITE_URL, SEO_COPY, seoMetadata } from "../app/seo.js";
import robots from "../app/robots.js";
import sitemap from "../app/sitemap.js";

test("defines canonical Chinese metadata for Zhongxin Toolbox", () => {
  assert.equal(SITE_URL, "https://zx-toolbox.netlify.app");
  assert.match(String(seoMetadata.title.default ?? seoMetadata.title), /中欣工具箱/);
  assert.match(seoMetadata.description, /电机/);
  assert.ok(seoMetadata.keywords.includes("中欣工具箱"));
  assert.ok(seoMetadata.keywords.includes("绕组计算"));
  assert.equal(seoMetadata.alternates.canonical, "/");
  assert.match(SEO_COPY.definition, /槽极配/);
  assert.match(SEO_COPY.calculation, /槽数/);
});

test("describes the site and each calculator with structured SEO data", async () => {
  const seo = await import("../app/seo.js");
  assert.ok(seo.siteSchema, "siteSchema should be exported");
  assert.equal(seo.siteSchema["@type"], "WebSite");
  for (const [id, path] of [
    ["slot-pole", "/slot-pole"],
    ["wire-layout", "/wire-layout"],
    ["coil-resistance", "/coil-resistance"],
  ]) {
    const metadata = seo.createToolMetadata(id);
    const schema = seo.createToolSchema(id);
    assert.equal(metadata.alternates.canonical, path);
    assert.equal(schema["@type"], "WebApplication");
    assert.equal(new URL(schema.url).pathname, path);
  }

  const coilMetadata = seo.createToolMetadata("coil-resistance");
  assert.match(coilMetadata.description, /铜线/);
  assert.match(coilMetadata.description, /铝线/);
  assert.match(coilMetadata.description, /电阻/);
  assert.match(coilMetadata.description, /重量/);
  assert.ok(coilMetadata.keywords.includes("线圈电阻"));
  assert.ok(coilMetadata.keywords.includes("线圈重量"));
  assert.ok(coilMetadata.keywords.includes("铜线电阻"));
  assert.ok(coilMetadata.keywords.includes("铝线电阻"));
});

test("configures static output for Netlify hosting", async () => {
  const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  const netlifyConfig = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");

  assert.match(nextConfig, /output:\s*"export"/);
  assert.match(netlifyConfig, /command\s*=\s*"pnpm build"/);
  assert.match(netlifyConfig, /publish\s*=\s*"dist\/client"/);
});

test("publishes crawlable robots and all toolbox routes", () => {
  const rules = robots();
  const entries = sitemap();
  assert.equal(rules.rules.allow, "/");
  assert.equal(rules.sitemap, `${SITE_URL}/sitemap.xml`);
  assert.deepEqual(entries.map(({ url }) => new URL(url).pathname), [
    "/",
    "/slot-pole",
    "/wire-layout",
    "/coil-resistance",
  ]);
});

test("publishes the slot pole calculator at its dedicated route", () => {
  const paths = sitemap().map(({ url }) => new URL(url).pathname);
  assert.ok(paths.includes("/slot-pole"));
});

test("ships crawl files in static export assets", async () => {
  const robots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");

  assert.match(robots, /Sitemap: https:\/\/zx-toolbox\.netlify\.app\/sitemap\.xml/);
  for (const route of ["", "/slot-pole", "/wire-layout", "/coil-resistance"]) {
    assert.match(sitemap, new RegExp(`<loc>https://zx-toolbox\\.netlify\\.app${route}<\\/loc>`));
  }
  assert.doesNotMatch(`${robots}\n${sitemap}`, /three-phase-winding-generator/);
});

test("renders a dedicated Chinese search explanation section", async () => {
  const component = await readFile(new URL("../app/SeoContent.tsx", import.meta.url), "utf8");
  assert.match(component, /槽极配是什么/);
  assert.match(component, /槽极配合计算：槽数与极数怎么算/);
  assert.match(component, /如何使用本生成器/);
  assert.match(component, /SEO_COPY/);
});

test("ships a slot pole social preview image", async () => {
  await access(new URL("../public/og.png", import.meta.url));
  assert.deepEqual(seoMetadata.openGraph.images, ["/og.png"]);
});

test("ships Google Search Console verification file at site root", async () => {
  const file = await readFile(
    new URL("../public/google187d414d3b86a0f3.html", import.meta.url),
    "utf8",
  );
  assert.equal(file.trim(), "google-site-verification: google187d414d3b86a0f3.html");
});

test("renders the approved iron-core winding diagram with one centered label per coil", async () => {
  const component = await readFile(new URL("../app/WindingDiagram.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(component, /buildWindingDiagramModel/);
  assert.match(component, /fixedCoilGeometry/);
  assert.match(component, /三相接线图/);
  assert.match(component, /<svg/);
  assert.match(component, /diagram-core-tooth/);
  assert.doesNotMatch(component, /diagram-edge-tooth/);
  assert.doesNotMatch(component, /coilSpan/);
  assert.doesNotMatch(component, /phaseOffset/);
  assert.doesNotMatch(css, /\.diagram-edge-tooth/);
  assert.match(component, /diagram-coil-label/);
  assert.match(component, /coil\.label/);
  assert.match(component, /strokeWidth={DIAGRAM_COIL_STROKE_WIDTH}/);
  assert.match(component, /buildPhaseRouteLayouts/);
  assert.match(component, /buildSeriesRouteSegments/);
  assert.match(component, /<marker/);
  assert.match(component, /markerEnd=/);
  assert.match(component, /diagram-route-order/);
  assert.match(component, /diagramHeight/);
  assert.match(component, /DIAGRAM_VIEWPORT_MAX_HEIGHT/);
  assert.match(component, /const viewportHeight = Math\.min/);
  assert.match(component, /style={{ height: viewportHeight }}/);
  assert.doesNotMatch(component, /buildSeriesRoute\(/);
  assert.doesNotMatch(component, /const DIAGRAM_HEIGHT/);
  assert.match(css, /\.diagram-route-order-badge/);
  assert.match(css, /\.diagram-route-order/);
  assert.match(component, /diagram-star-bus/);
  assert.match(component, /diagram-star-node/);
  assert.match(component, /中性点 N/);
  assert.doesNotMatch(component, /星点 N/);
  assert.match(component, /U2 \/ V2 \/ W2/);
  assert.doesNotMatch(component, /endTerminal/);
  assert.doesNotMatch(component, /lowerMark/);
  assert.match(component, /addEventListener\("wheel"/);
  assert.match(component, /#bc6200/);
  assert.match(component, /#245ba9/);
  assert.match(component, /#007a70/);
});

test("renders the approved compact title and six-column winding table", async () => {
  const page = await readFile(new URL("../app/slot-pole/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /槽极配生成器/);
  assert.doesNotMatch(page, /className="kicker"/);
  assert.doesNotMatch(page, /className="intro"/);
  assert.match(page, /<th>线圈标记<\/th>/);
  assert.doesNotMatch(page, /<th>上层槽<\/th>/);
  assert.doesNotMatch(page, /<th>下层槽<\/th>/);
  assert.doesNotMatch(page, /<th>上层标记<\/th>/);
  assert.doesNotMatch(page, /<th>下层标记<\/th>/);
  assert.match(page, /<td>{row\.upperMark}<\/td>/);
  assert.match(page, /key={`\$\{slots\}:\$\{poles\}`}/);
  assert.doesNotMatch(page, /resetKey=/);
  assert.match(css, /\.winding-diagram/);
  assert.match(css, /--a: #bc6200/);
  assert.match(css, /--b: #245ba9/);
  assert.match(css, /--c: #007a70/);
});

test("expands twelve-slot diagrams across the workspace and keeps scalable overflow", async () => {
  const component = await readFile(new URL("../app/WindingDiagram.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(component, /model\.slotCount >= 12/);
  assert.match(component, /winding-diagram is-wide/);
  assert.match(component, /style={{ width: scaledWidth, height: scaledHeight }}/);
  assert.match(css, /\.winding-diagram\.is-wide/);
  assert.match(css, /grid-column: 1 \/ -1/);
  assert.match(css, /overflow: auto/);
});
