import { SEO_COPY } from "./seo.js";

export default function SeoContent() {
  return (
    <section className="seo-content" aria-labelledby="seo-title">
      <div className="section-title">
        <h2 id="seo-title">槽极配是什么</h2>
        <p>{SEO_COPY.definition}</p>
      </div>

      <div className="seo-copy-grid">
        <article>
          <h3>槽极配合计算：槽数与极数怎么算</h3>
          <p>{SEO_COPY.calculation}</p>
        </article>
        <article>
          <h3>如何使用本生成器</h3>
          <p>{SEO_COPY.usage}</p>
        </article>
      </div>

      <div className="seo-faq" aria-label="槽极配常见问题">
        <h3>常见问题</h3>
        <details>
          <summary>支持哪些输入？</summary>
          <p>{SEO_COPY.faqInput}</p>
        </details>
        <details>
          <summary>BC 互换和 UVW 显示有什么用？</summary>
          <p>{SEO_COPY.faqPhase}</p>
        </details>
      </div>
    </section>
  );
}
