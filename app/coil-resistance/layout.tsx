import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createToolMetadata, createToolSchema } from "../seo.js";

export const metadata: Metadata = createToolMetadata("coil-resistance");

export default function CoilResistanceLayout({ children }: { children: ReactNode }) {
  const schema = createToolSchema("coil-resistance");
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </>
  );
}
