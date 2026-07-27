import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "槽极配生成器｜中欣工具箱",
  description: "输入槽数和总极数，生成三相双层绕组推荐节距、线圈接线表与接线图。",
  alternates: {
    canonical: "/slot-pole",
  },
};

export default function SlotPoleLayout({ children }: { children: ReactNode }) {
  return children;
}
