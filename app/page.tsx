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
            <p className={styles.heroSubtitle}>工程计算，不必复杂</p>
          </header>
          <HomeToolRail />
        </section>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
      />
    </>
  );
}
