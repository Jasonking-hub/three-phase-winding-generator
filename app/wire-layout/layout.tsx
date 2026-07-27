import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "漆包线排线计算器｜中欣工具箱",
  description: "按层数计算漆包线梅花形密排尺寸，或按最大宽度和厚度反推可排层数与根数。",
  alternates: { canonical: "/wire-layout" },
};

export default function WireLayoutLayout({ children }: { children: ReactNode }) {
  return children;
}
