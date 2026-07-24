import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { SITE_URL, SEO_COPY, seoMetadata, webApplicationSchema } from "../app/seo.js";
import robots from "../app/robots.js";
import sitemap from "../app/sitemap.js";

test("defines canonical Chinese metadata for slot pole matching", () => {
  assert.equal(SITE_URL, "https://three-phase-winding-generator.jasonking15871921724.chatgpt.site");
  assert.equal(seoMetadata.title, "槽极配生成器 | 槽极配合计算 | 三相双层绕组");
  assert.match(seoMetadata.description, /槽极配/);
  assert.equal(seoMetadata.alternates.canonical, SITE_URL);
  assert.equal(webApplicationSchema["@type"], "WebApplication");
  assert.match(SEO_COPY.definition, /槽极配/);
  assert.match(SEO_COPY.calculation, /槽数/);
});

test("publishes crawlable robots and a single canonical sitemap URL", () => {
  const rules = robots();
  const entries = sitemap();
  assert.equal(rules.rules.allow, "/");
  assert.equal(rules.sitemap, `${SITE_URL}/sitemap.xml`);
  assert.deepEqual(entries.map(({ url }) => url), [SITE_URL]);
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

test("renders a three-phase coil-only connection diagram", async () => {
  const component = await readFile(new URL("../app/WindingDiagram.tsx", import.meta.url), "utf8");
  assert.match(component, /buildWindingDiagram/);
  assert.match(component, /三相接线图/);
  assert.match(component, /<svg/);
  assert.match(component, /upperMark/);
  assert.match(component, /lowerMark/);
  assert.match(component, /#bc6200/);
  assert.match(component, /#245ba9/);
  assert.match(component, /#007a70/);
});

test("renders the approved compact title and six-column winding table", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
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
  assert.match(page, /resetKey={`\$\{slots\}:\$\{poles\}`}/);
  assert.match(css, /\.winding-diagram/);
  assert.match(css, /--a: #bc6200/);
  assert.match(css, /--b: #245ba9/);
  assert.match(css, /--c: #007a70/);
});

test("preserves full diagram width for high slot counts", async () => {
  const component = await readFile(new URL("../app/WindingDiagram.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(component, /style={{ width }}/);
  assert.doesNotMatch(css, /\.diagram-scroll svg \{[^}]*width: 100%/);
});
