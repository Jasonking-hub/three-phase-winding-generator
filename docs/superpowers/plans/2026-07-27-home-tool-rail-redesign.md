# Fluid Homepage Tool Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split homepage hero with one full-width, smoothly animated three-tool rail.

**Architecture:** Keep `HomePage` as the server-rendered semantic shell and `HomeToolRail` as the existing client interaction island. Move active-state layout control onto the rail through `data-active-id`, then let CSS Grid interpolate among three column templates while card content crossfades without unstable title reflow.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, native CSS Grid transitions, Node `node:test`.

## Global Constraints

- Modify only homepage structure, homepage rail interaction, homepage styles, tests, and QA documentation.
- Keep all three routes, calculator logic, SEO schema, site header, site footer, and “更多工具”.
- Desktop states are exactly `2.2fr 1fr 1fr`, `1fr 2.2fr 1fr`, and `1fr 1fr 2.2fr`.
- Use `650ms cubic-bezier(0.16, 1, 0.3, 1)` for the rail transition.
- Add no dependencies and no continuous pointer tracking.
- Below `1024px`, use a single-column rail with no horizontal expansion.
- Honor `prefers-reduced-motion: reduce`.

---

### Task 1: Implement the full-width fluid rail with TDD

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/HomeToolRail.tsx`
- Modify: `app/home.module.css`
- Modify: `tests/home.test.mjs`

**Interfaces:**
- Consumes: `TOOL_REGISTRY`, active tool id, existing `ToolVisual` variants, and homepage source files as UTF-8 text.
- Produces: `<div className={styles.toolRail} data-active-id={activeId}>`, stable compact/full card content layers, and regression coverage for full-width structure, active rail state, grid interpolation, and reduced motion.

- [ ] **Step 1: Add the failing source-contract test**

```js
import { readFileSync } from "node:fs";

const homePageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const railSource = readFileSync(new URL("../app/HomeToolRail.tsx", import.meta.url), "utf8");
const homeCssSource = readFileSync(new URL("../app/home.module.css", import.meta.url), "utf8");

test("uses a full-width three-state grid rail with reduced-motion fallback", () => {
  assert.doesNotMatch(homePageSource, /heroCopy/);
  assert.match(homePageSource, /<h1 id="home-title">中欣工具箱<\/h1>/);
  assert.match(railSource, /data-active-id=\{activeId\}/);
  assert.match(homeCssSource, /grid-template-columns:\s*2\.2fr 1fr 1fr/);
  assert.match(homeCssSource, /650ms cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
  assert.match(homeCssSource, /prefers-reduced-motion:\s*reduce/);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/home.test.mjs`

Expected: FAIL because `heroCopy` still exists and the rail has no `data-active-id` or CSS Grid state templates.

- [ ] **Step 3: Flatten the homepage structure**

Change `app/page.tsx` so the hero contains one compact heading block followed by `HomeToolRail`; remove the bordered `heroCopy` card. Keep the exact `h1` text and JSON-LD.

```tsx
<section className={styles.hero} aria-labelledby="home-title">
  <header className={styles.homeHeading}>
    <h1 id="home-title">中欣工具箱</h1>
    <p>槽极配、漆包线排线与线圈电阻，一处进入。</p>
  </header>
  <HomeToolRail />
</section>
```

- [ ] **Step 4: Put active state on the rail and add stable content layers**

In `HomeToolRail.tsx`, remove the redundant section eyebrow and heading. Add `data-active-id={activeId}` to `toolRail`. Inside each card, keep the full title/description in a fixed-width layer and add a compact title layer used only by inactive cards. Preserve pointer, focus, Space-key, and link behavior.

```tsx
<div className={styles.toolRail} data-active-id={activeId}>
  {/* existing links */}
</div>
```

- [ ] **Step 5: Replace flex sizing with three interpolated grid states**

In `home.module.css`:

```css
.toolRail {
  display: grid;
  grid-template-columns: 2.2fr 1fr 1fr;
  transition: grid-template-columns 650ms cubic-bezier(0.16, 1, 0.3, 1);
}

.toolRail[data-active-id="wire-layout"] {
  grid-template-columns: 1fr 2.2fr 1fr;
}

.toolRail[data-active-id="coil-resistance"] {
  grid-template-columns: 1fr 1fr 2.2fr;
}
```

Remove `flex`, `flex-grow`, and their transition from `.toolCard`. Crossfade compact/full content with opacity and `translateY(6px)` using the same easing. Under `1024px`, set `grid-template-columns: 1fr` for every state and show full content. Under reduced motion, set all related transitions to `none`.

- [ ] **Step 6: Run the focused test and confirm GREEN**

Run: `node --test tests/home.test.mjs`

Expected: 2 tests pass, 0 fail.

- [ ] **Step 7: Run static and code verification**

Run: `npm test`

Expected: all business tests pass.

Run: `npm run lint`

Expected: exit 0 with no findings.

Run: `npm run test:build`

Expected: production build exits 0 and rendered HTML tests pass.

- [ ] **Step 8: Commit the implementation**

```bash
git add app/page.tsx app/HomeToolRail.tsx app/home.module.css tests/home.test.mjs
git commit -m "fix: smooth homepage tool rail"
```

---

### Task 2: Browser acceptance

**Files:**
- Modify: `docs/qa/2026-07-27-zx-toolbox-browser-qa.md`

**Interfaces:**
- Consumes: local homepage at `http://localhost:54581/`.
- Produces: recorded desktop, keyboard, reduced-motion source, and mobile acceptance evidence.

- [ ] **Step 1: Verify desktop layout and motion**

Open the homepage at desktop width. Confirm the left introduction card is absent, the rail fills the content width, and moving across all three cards produces uninterrupted interpolation without reset flashes or title reflow.

- [ ] **Step 2: Verify keyboard and mobile behavior**

Tab through all cards and confirm focus activates the same state. At 390 × 844, confirm one-column cards and `scrollWidth === clientWidth`.

- [ ] **Step 3: Record the result and commit**

Append the new checks to the QA document, then run `git diff --check` and commit:

```bash
git add docs/qa/2026-07-27-zx-toolbox-browser-qa.md
git commit -m "docs: record homepage rail acceptance"
```
