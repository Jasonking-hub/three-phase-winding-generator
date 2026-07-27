import { SITE_URL } from "./seo.js";

export default function sitemap() {
  return ["", "/slot-pole", "/wire-layout", "/coil-resistance"].map((path, index) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: index === 0 ? 1 : 0.9,
  }));
}
