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
