import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "三相双层绕组槽极配生成器",
  description: "根据槽数、总极数与相别设置生成三相双层绕组线圈接线表。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
