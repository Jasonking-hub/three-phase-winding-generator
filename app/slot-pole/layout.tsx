import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createToolMetadata, createToolSchema } from "../seo.js";

export const metadata: Metadata = createToolMetadata("slot-pole");

export default function SlotPoleLayout({ children }: { children: ReactNode }) {
  const schema = createToolSchema("slot-pole");
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
