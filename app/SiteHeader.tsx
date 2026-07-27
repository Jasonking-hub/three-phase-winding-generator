import Link from "next/link";
import { TOOL_REGISTRY } from "./tools.js";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-brand" href="/" aria-label="中欣工具箱首页">
          <span className="site-brand__mark" aria-hidden="true">ZX</span>
          <span>中欣工具箱</span>
        </Link>
        <nav className="site-nav" aria-label="工具导航">
          <Link href="/">全部工具</Link>
          {TOOL_REGISTRY.map((tool) => (
            <Link href={tool.href} key={tool.id}>{tool.name}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
