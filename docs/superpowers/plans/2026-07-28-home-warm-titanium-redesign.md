# Home Warm Titanium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页改为暖钛编辑风格，增加“工程计算，不必复杂”，删除空的“更多工具”，并让现有工具轨道切换更平滑。

**Architecture:** 保持 `HomeToolRail` 的组件结构、数据和内部图形不变；页面结构只增删标题区文案，视觉与动效由现有 CSS Module 完成。共享 CSS 仅修改顶部导航材质，不触碰计算器表单、结果和业务样式。

**Tech Stack:** React 19、Next.js/Vinext、CSS Modules、Node.js `node:test`

## Global Constraints

- 不新增运行时依赖。
- 不修改 `app/HomeToolRail.tsx`、`app/tools.js` 或三个计算器组件。
- 不改变工具顺序、名称、说明、图形、链接和 aria-label。
- 不加入彩色渐变、霓虹、噪点、循环动画或弹跳。
- `prefers-reduced-motion: reduce` 下禁止宽度、位移和缩放动画。

---

### Task 1: 首页标题与空区清理

**Files:**
- Modify: `tests/home.test.mjs`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `HomeToolRail` 现有无参数组件。
- Produces: 带 H1、副标题和工具轨道的首页；不再渲染 `moreTools` 区块。

- [ ] **Step 1: 写失败测试**

在 `uses a concise homepage with a responsive three-state tool rail` 测试中增加：

```js
assert.match(homePageSource, /<p className=\{styles\.heroSubtitle\}>工程计算，不必复杂<\/p>/);
assert.doesNotMatch(homePageSource, /moreTools/);
assert.doesNotMatch(homePageSource, /更多工具/);
```

- [ ] **Step 2: 运行测试并确认预期失败**

Run: `node --test tests/home.test.mjs`

Expected: FAIL；缺少 `heroSubtitle`，且源码仍包含 `moreTools`。

- [ ] **Step 3: 最小实现页面结构**

将 `app/page.tsx` 的首页主体改为：

```tsx
<main className={styles.homePage}>
  <section className={styles.hero} aria-labelledby="home-title">
    <header className={styles.homeHeading}>
      <h1 id="home-title">中欣工具箱</h1>
      <p className={styles.heroSubtitle}>工程计算，不必复杂</p>
    </header>
    <HomeToolRail />
  </section>
</main>
```

保留页面末尾现有 JSON-LD `<script>`。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test tests/home.test.mjs`

Expected: 首页结构测试 PASS，其他首页测试保持 PASS。

- [ ] **Step 5: 提交结构变更**

```bash
git add app/page.tsx tests/home.test.mjs
git commit -m "feat: simplify homepage hero"
```

---

### Task 2: 暖钛首页视觉与流畅轨道

**Files:**
- Modify: `tests/home.test.mjs`
- Modify: `app/home.module.css`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `data-active-id`、`data-active="true"`、`toolFullContent`、`toolCompactTitle` 现有 DOM 合约。
- Produces: 暖钛首页变量、`420ms` 轨道切换、`260ms` 内容显隐和辅助媒体规则。

- [ ] **Step 1: 写失败测试**

更新首页 CSS 断言为：

```js
assert.match(homeCssSource, /--home-bg:\s*#f2f0ec/);
assert.match(homeCssSource, /--home-accent:\s*#775b3e/);
assert.match(homeCssSource, /--home-ease-out:\s*cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
assert.match(homeCssSource, /grid-template-columns 420ms var\(--home-ease-out\)/);
assert.match(homeCssSource, /opacity 260ms var\(--home-ease-out\)/);
assert.match(homeCssSource, /prefers-reduced-motion:\s*reduce/);
assert.match(globalCssSource, /prefers-reduced-transparency:\s*reduce/);
assert.match(globalCssSource, /prefers-contrast:\s*more/);
assert.doesNotMatch(homeCssSource, /background:\s*var\(--color-ink/);
```

继续保留现有轨道状态、内部内容层和移动端回退断言。

- [ ] **Step 2: 运行测试并确认预期失败**

Run: `node --test tests/home.test.mjs`

Expected: FAIL；旧 CSS 仍使用藏蓝活动卡、`220ms` 动效，且缺少暖钛和辅助媒体规则。

- [ ] **Step 3: 实现首页局部视觉变量**

在 `.homePage` 中定义并使用：

```css
--home-bg: #f2f0ec;
--home-surface: #fbfaf7;
--home-surface-muted: #e8e4de;
--home-ink: #282624;
--home-muted: #716d67;
--home-accent: #775b3e;
--home-line: rgb(72 65 57 / 14%);
--home-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
```

页面背景使用暖灰白；标题居中；副标题最大宽度受控并使用 `--home-muted`。工具区取消厚重外框，活动卡使用 `--home-surface` 与柔和阴影，非活动卡使用 `--home-surface-muted`。

- [ ] **Step 4: 实现平滑、可重定向的 CSS 过渡**

保留三种 `grid-template-columns` 状态，将相关过渡设为：

```css
.toolRail {
  transition: grid-template-columns 420ms var(--home-ease-out);
}

.toolCard {
  transition:
    transform 180ms var(--home-ease-out),
    background-color 300ms var(--home-ease-out),
    border-color 300ms var(--home-ease-out),
    color 300ms var(--home-ease-out),
    box-shadow 300ms var(--home-ease-out);
}

.toolFullContent,
.toolCompactTitle {
  transition:
    opacity 260ms var(--home-ease-out),
    transform 260ms var(--home-ease-out);
}
```

hover/focus 上浮保持 `-2px`；active 使用 `scale(0.98)`。不增加 JavaScript 计时器或输入锁。

- [ ] **Step 5: 更新顶部导航材质与辅助媒体规则**

只改 `.site-header`、`.site-brand__mark`、`.site-nav a` 的颜色和材质。追加：

```css
@media (prefers-reduced-transparency: reduce) {
  .site-header { background: #fbfaf7; backdrop-filter: none; }
}

@media (prefers-contrast: more) {
  .site-header { border-bottom-color: #5d5851; }
  .site-nav a { color: #282624; }
}
```

保留现有导航结构和尺寸。

- [ ] **Step 6: 运行首页测试并确认通过**

Run: `node --test tests/home.test.mjs`

Expected: 全部首页测试 PASS。

- [ ] **Step 7: 运行完整自动验证**

Run: `pnpm test`

Expected: 全部单元测试 PASS。

Run: `pnpm lint`

Expected: exit code `0`，无 ESLint error。

Run: `pnpm build`

Expected: exit code `0`，四个公开路由完成静态构建。

Run: `pnpm test:build`

Expected: exit code `0`，最终静态 HTML 测试 PASS。

- [ ] **Step 8: 提交样式变更**

```bash
git add app/home.module.css app/globals.css tests/home.test.mjs
git commit -m "feat: restyle homepage in warm titanium"
```

---

### Task 3: 浏览器视觉与交互验收

**Files:**
- Modify only if a defect is found: files from Task 1 or Task 2

**Interfaces:**
- Consumes: 本地静态或开发服务器。
- Produces: 桌面、键盘、移动端和减弱动态验收证据。

- [ ] **Step 1: 桌面视觉验收**

在 `1280×720` 查看首页，确认：标题和副标题居中；没有“更多工具”；三张卡完整落在视口内；活动卡为暖白实体层；内部工程图形、名称和说明未改。

- [ ] **Step 2: 连续指针与键盘验收**

快速在三张卡间横移指针，确认轨道从当前尺寸连续重定向；依次用 Tab 聚焦三张卡，确认焦点与活动状态同步、焦点环可见、Enter 可进入对应路由。

- [ ] **Step 3: 移动端验收**

在 `390×844` 查看首页，确认三张卡纵向完整显示，页面无横向滚动，所有触摸目标不小于 `44px`。

- [ ] **Step 4: 辅助偏好验收**

启用 `prefers-reduced-motion: reduce`，确认无列宽、位移或缩放动画；启用 reduced transparency / more contrast 时确认导航仍清晰。

- [ ] **Step 5: 缺陷回归**

若视觉验收发现缺陷，先在 `tests/home.test.mjs` 增加可自动重现的失败断言，再进行最小修复并重新执行 Task 2 Step 6–7。
