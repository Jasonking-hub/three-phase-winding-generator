import type { Metadata } from "next";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { seoMetadata } from "./seo.js";
import "./globals.css";

export const metadata: Metadata = seoMetadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">跳到主要内容</a>
        <SiteHeader />
        <div id="main-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
