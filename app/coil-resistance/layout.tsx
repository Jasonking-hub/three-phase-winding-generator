import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "线圈电阻计算器 | 中欣工具箱",
  description: "按 Excel 固定公式计算圆形线圈和电机线圈的铜线电阻。",
  alternates: { canonical: "/coil-resistance" },
};

export default function CoilResistanceLayout({ children }: { children: ReactNode }) {
  return children;
}
