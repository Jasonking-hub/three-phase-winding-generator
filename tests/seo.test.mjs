import assert from "node:assert/strict";
import test from "node:test";
import { SITE_URL, SEO_COPY, seoMetadata, webApplicationSchema } from "../app/seo.js";

test("defines canonical Chinese metadata for slot pole matching", () => {
  assert.equal(SITE_URL, "https://three-phase-winding-generator.jasonking15871921724.chatgpt.site");
  assert.equal(seoMetadata.title, "槽极配生成器 | 槽极配合计算 | 三相双层绕组");
  assert.match(seoMetadata.description, /槽极配/);
  assert.equal(seoMetadata.alternates.canonical, SITE_URL);
  assert.equal(webApplicationSchema["@type"], "WebApplication");
  assert.match(SEO_COPY.definition, /槽极配/);
  assert.match(SEO_COPY.calculation, /槽数/);
});
