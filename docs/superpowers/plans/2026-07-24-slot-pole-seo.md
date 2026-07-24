# 槽极配生成器 SEO 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让公开槽极配生成器具备可抓取的中文 SEO 元数据、说明内容、robots 和 sitemap。

**Architecture:** 新建一个纯 ESM SEO 配置模块，集中维护规范 URL、元数据、JSON-LD 和中文说明文案。Next 的布局、爬虫端点和首页说明区都从该模块取值，避免 URL 或关键词出现不一致。SEO 端点保持静态、无外部服务依赖。

**Tech Stack:** Next App Router、React 19、Node 内置测试、Vinext、Cloudflare Sites。

## Global Constraints

- 规范 URL 固定为 `https://three-phase-winding-generator.jasonking15871921724.chatgpt.site`。
- 覆盖“槽极配”“槽极配合计算”“槽数极数怎么算”，但不得堆砌关键词或创建重复页。
- 不修改绕组计算函数、输入交互、公开访问设置或现有 URL。
- `robots.txt` 允许抓取，并声明 `/sitemap.xml`。
- 不承诺收录时间或关键词排名。

---

### Task 1: 建立可测试的 SEO 配置

**Files:**
- Create: `app/seo.js`
- Create: `tests/seo.test.mjs`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `SITE_URL`, `SEO_COPY`, `seoMetadata` 和 `webApplicationSchema`。
- Consumes: 无。

- [ ] **Step 1: 写失败测试**

```js
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
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/seo.test.mjs`

Expected: `ERR_MODULE_NOT_FOUND`，因为 `app/seo.js` 尚不存在。

- [ ] **Step 3: 写最小配置实现**

```js
export const SITE_URL = "https://three-phase-winding-generator.jasonking15871921724.chatgpt.site";

export const SEO_COPY = {
  definition: "槽极配用于确定三相绕组中槽数、极数和线圈相带的对应关系。",
  calculation: "槽极配合计算从槽数 Q 和总极数 P 开始，生成推荐节距与线圈接线表。",
  usage: "输入槽数和总极数，选择 ABC 或 UVW 相别显示，再按需要切换 BC 相。",
  faqInput: "支持 3 至 120 的槽数 Q，且 Q 必须为 3 的倍数；总极数 P 需为 2 至 120 的偶数。",
  faqPhase: "ABC 与 UVW 只切换相别名称；BC 互换会交换 B/C 或 V/W 的相别标签。",
};

export const seoMetadata = {
  title: "槽极配生成器 | 槽极配合计算 | 三相双层绕组",
  description: "免费三相双层绕组槽极配生成器。输入槽数和总极数，计算节距、相别与线圈接线表。",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    title: "槽极配生成器 | 槽极配合计算",
    description: "计算三相双层绕组的槽极配、节距、相别和线圈接线。",
  },
};

export const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "槽极配生成器",
  applicationCategory: "EngineeringApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  inLanguage: "zh-CN",
  description: seoMetadata.description,
};
```

`app/layout.tsx` 中使用：

```tsx
import type { Metadata } from "next";
import { seoMetadata, webApplicationSchema } from "./seo.js";
import "./globals.css";

export const metadata: Metadata = seoMetadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }} /></body></html>;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/seo.test.mjs`

Expected: 1 test passes.

- [ ] **Step 5: 提交**

```bash
git add app/seo.js app/layout.tsx tests/seo.test.mjs
git commit -m "Add slot pole SEO metadata"
```

### Task 2: 添加 robots 和 sitemap 端点

**Files:**
- Create: `app/robots.js`
- Create: `app/sitemap.js`
- Modify: `tests/seo.test.mjs`

**Interfaces:**
- Consumes: `SITE_URL` from `app/seo.js`。
- Produces: Next 特殊端点 `/robots.txt` 和 `/sitemap.xml`。

- [ ] **Step 1: 扩展失败测试**

```js
import robots from "../app/robots.js";
import sitemap from "../app/sitemap.js";

test("publishes crawlable robots and a single canonical sitemap URL", () => {
  const rules = robots();
  const entries = sitemap();
  assert.equal(rules.rules.allow, "/");
  assert.equal(rules.sitemap, `${SITE_URL}/sitemap.xml`);
  assert.deepEqual(entries.map(({ url }) => url), [SITE_URL]);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/seo.test.mjs`

Expected: `ERR_MODULE_NOT_FOUND`，因为两个端点文件尚不存在。

- [ ] **Step 3: 写最小端点实现**

```js
// app/robots.js
import { SITE_URL } from "./seo.js";

export default function robots() {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${SITE_URL}/sitemap.xml` };
}

// app/sitemap.js
import { SITE_URL } from "./seo.js";

export default function sitemap() {
  return [{ url: SITE_URL, lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/seo.test.mjs`

Expected: 2 tests pass.

- [ ] **Step 5: 提交**

```bash
git add app/robots.js app/sitemap.js tests/seo.test.mjs
git commit -m "Add crawler discovery endpoints"
```

### Task 3: 添加可抓取的中文说明区

**Files:**
- Create: `app/SeoContent.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/seo.test.mjs`

**Interfaces:**
- Consumes: `SEO_COPY` from `app/seo.js`。
- Produces: `SeoContent` React 组件。

- [ ] **Step 1: 扩展失败测试**

```js
import { readFile } from "node:fs/promises";

test("renders a dedicated Chinese search explanation section", async () => {
  const component = await readFile(new URL("../app/SeoContent.tsx", import.meta.url), "utf8");
  assert.match(component, /槽极配是什么/);
  assert.match(component, /槽极配合计算：槽数与极数怎么算/);
  assert.match(component, /如何使用本生成器/);
  assert.match(component, /SEO_COPY/);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/seo.test.mjs`

Expected: `ENOENT`，因为 `app/SeoContent.tsx` 尚不存在。

- [ ] **Step 3: 写最小说明区与样式**

```tsx
import { SEO_COPY } from "./seo.js";

export default function SeoContent() {
  return <section className="seo-content" aria-labelledby="seo-title">
    <h2 id="seo-title">槽极配是什么</h2>
    <p>{SEO_COPY.definition}</p>
    <h3>槽极配合计算：槽数与极数怎么算</h3>
    <p>{SEO_COPY.calculation}</p>
    <h3>如何使用本生成器</h3>
    <p>{SEO_COPY.usage}</p>
    <h3>常见问题</h3>
    <details><summary>支持哪些输入？</summary><p>{SEO_COPY.faqInput}</p></details>
    <details><summary>BC 互换和 UVW 显示有什么用？</summary><p>{SEO_COPY.faqPhase}</p></details>
  </section>;
}
```

在 `app/page.tsx` 导入 `SeoContent`，并放在三相端子区之后。`app/globals.css` 添加与现有白底、蓝色边框和响应式宽度一致的 `.seo-content` 样式，不使用动画或新的依赖。

- [ ] **Step 4: 运行测试和生产构建**

Run: `node --test tests/seo.test.mjs && .\\node_modules\\.bin\\vinext.cmd build`

Expected: 所有 SEO 测试通过；构建完成且生成 `dist/server/index.js`。

- [ ] **Step 5: 提交**

```bash
git add app/SeoContent.tsx app/page.tsx app/globals.css tests/seo.test.mjs
git commit -m "Add searchable slot pole explanations"
```

### Task 4: 生成社交预览并完成发布

**Files:**
- Create: `public/og.png`
- Modify: `app/seo.js`

**Interfaces:**
- Consumes: 既有工程蓝、白色表格与三相蓝橙绿的视觉语言。
- Produces: 静态 Open Graph 图和带 `images` 字段的 `seoMetadata.openGraph`。

- [ ] **Step 1: 写失败测试**

```js
import { access } from "node:fs/promises";

test("ships a slot pole social preview image", async () => {
  await access(new URL("../public/og.png", import.meta.url));
  assert.deepEqual(seoMetadata.openGraph.images, ["/og.png"]);
});
```

- [ ] **Step 2: 运行失败测试**

Run: `node --test tests/seo.test.mjs`

Expected: 因 `public/og.png` 和 `images` 字段不存在而失败。

- [ ] **Step 3: 生成并接入图像**

只调用一次图像生成：创建 1200×630 横向社交卡，包含可读中文“槽极配生成器”和“槽极配合计算”，复用深工程蓝底、白色接线表格线条，以及蓝橙绿三相标识。检查文字准确性；仅在不可用时重试一次。将通过检查的图保存为 `public/og.png`，并追加：

```js
images: ["/og.png"],
```

- [ ] **Step 4: 运行完整验证**

Run: `node --test tests/seo.test.mjs tests/winding.test.mjs && .\\node_modules\\.bin\\vinext.cmd build`

Expected: 全部测试通过，且 `dist/server/index.js` 与 `dist/.openai/hosting.json` 存在。

- [ ] **Step 5: 提交、打包并发布**

```bash
git add app/seo.js public/og.png tests/seo.test.mjs
git commit -m "Add SEO social preview"
```

使用现有 Sites 项目保存新版本并公开发布。部署成功后保留公开 URL 不变。
