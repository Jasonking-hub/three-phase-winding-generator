import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createToolMetadata, createToolSchema } from "../seo.js";

export const metadata: Metadata = createToolMetadata("wire-layout");

export default function WireLayoutLayout({ children }: { children: ReactNode }) {
  const schema = createToolSchema("wire-layout");
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
