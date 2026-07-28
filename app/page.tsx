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
          </header>
          <HomeToolRail />
        </section>
        <section className={styles.moreTools} aria-labelledby="more-tools-title">
          <h2 id="more-tools-title">更多工具</h2>
        </section>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
      />
    </>
  );
}
