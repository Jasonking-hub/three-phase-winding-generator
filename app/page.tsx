import HomeToolRail from "./HomeToolRail";
import styles from "./home.module.css";
import { siteSchema } from "./seo.js";

export default function HomePage() {
  return (
    <>
      <main className={styles.homePage}>
        <section className={styles.hero} aria-labelledby="home-title">
          <header className={styles.homeHeading}>
            <h1 id="home-title">中欣工具箱</h1>
            <p>槽极配、漆包线排线与线圈电阻，一处进入。</p>
          </header>
          <HomeToolRail />
        </section>
        <section className={styles.moreTools} aria-labelledby="more-tools-title">
          <p className={styles.sectionEyebrow}>持续扩展</p>
          <h2 id="more-tools-title">更多工具</h2>
          <p>后续将围绕电机设计与制造中的常用计算持续补充工具。</p>
        </section>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
      />
    </>
  );
}
