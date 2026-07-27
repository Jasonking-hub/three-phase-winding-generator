import HomeToolRail from "./HomeToolRail";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.homePage}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>电机工程计算</p>
          <h1 id="home-title">中欣工具箱</h1>
          <p className={styles.summary}>
            为槽极配、漆包线排线和线圈电阻提供可追溯的本地工程计算。
          </p>
        </div>
        <HomeToolRail />
      </section>
      <section className={styles.moreTools} aria-labelledby="more-tools-title">
        <p className={styles.sectionEyebrow}>持续扩展</p>
        <h2 id="more-tools-title">更多工具</h2>
        <p>后续将围绕电机设计与制造中的常用计算持续补充工具。</p>
      </section>
    </main>
  );
}
