export const SITE_URL = "https://three-phase-winding-generator.jasonking15871921724.chatgpt.site";

export const SEO_COPY = {
  definition: "槽极配用于确定三相绕组中槽数、极数和线圈相带的对应关系。",
  calculation: "槽极配合计算从槽数 Q 和总极数 P 开始，生成推荐节距与线圈接线表。",
  usage: "输入槽数和总极数，选择 ABC 或 UVW 相别显示，再按需要切换 BC 相。",
  faqInput: "支持 3 至 120 的槽数 Q，且 Q 必须为 3 的倍数；总极数 P 需为 2 至 120 的偶数。",
  faqPhase: "ABC 与 UVW 只切换相别名称；BC 互换会交换 B/C 或 V/W 的相别标签。",
};

export const seoMetadata = {
  title: "槽极配生成器 | 槽极配合计算 | 三相双层绕组",
  description: "免费三相双层绕组槽极配生成器。输入槽数和总极数，计算节距、相别与线圈接线表。",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    title: "槽极配生成器 | 槽极配合计算",
    description: "计算三相双层绕组的槽极配、节距、相别和线圈接线。",
    images: ["/og.png"],
  },
};

export const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "槽极配生成器",
  applicationCategory: "EngineeringApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  inLanguage: "zh-CN",
  description: seoMetadata.description,
};
