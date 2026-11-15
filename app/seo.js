export const SITE_URL = "https://zx-toolbox.netlify.app";
export const SITE_NAME = "中欣工具箱";

export const SEO_COPY = {
  definition: "槽极配用于确定三相绕组中槽数、极数和线圈相带的对应关系。",
  calculation: "槽极配合计算从槽数 Q 和总极数 P 开始：槽极怎么算可先确定每极每相槽数，再生成推荐节距与线圈接线表。",
  usage: "输入槽数、总极数和节距，选择自动计算出的每相并联支路数；接线表、三相接线图和端子说明同步更新。支持 ABC/UVW 显示及 BC 互换。",
  faqInput: "支持 3 至 120 且为 3 的倍数的槽数 Q、2 至 120 的偶数总极数 P，以及 1 至 Q−1 的整数节距 y。并联选项按同匝数、同线径、对称磁场下的等效线圈组合计算；仅能串联时显示 1（全部串联）。",
  faqPhase: "ABC 与 UVW 只切换相别名称；BC 互换会交换 B/C 或 V/W 的相别标签。",
};

export const seoMetadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "中欣工具箱｜电机与绕组工程计算",
    template: "%s｜中欣工具箱",
  },
  description: "中欣工具箱提供槽极配、漆包线排线和线圈电阻等电机与绕组计算工具，所有计算均在浏览器本地完成。",
  keywords: ["中欣工具箱", "电机计算工具", "绕组计算", "槽极配", "漆包线排线", "线圈电阻"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "中欣工具箱｜电机与绕组工程计算",
    description: "槽极配、漆包线排线与线圈电阻，集中在一个本地运行的工程工具箱中。",
    images: ["/og.png"],
  },
};

export const siteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "zh-CN",
  description: seoMetadata.description,
};

export const TOOL_SEO = {
  "slot-pole": {
    name: "槽极配生成器",
    path: "/slot-pole",
    description: "输入槽数与总极数，生成三相双层绕组推荐节距、线圈接线表与接线图。",
    keywords: ["槽极配", "槽极配合计算", "三相双层绕组", "绕组节距"],
  },
  "wire-layout": {
    name: "漆包线排线计算器",
    path: "/wire-layout",
    description: "按含漆膜线径与边界计算梅花形密排的层数、根数、尺寸和剩余量。",
    keywords: ["漆包线排线", "梅花形密排", "绕线排布", "线径计算"],
  },
  "coil-resistance": {
    name: "线圈电阻计算器",
    path: "/coil-resistance",
    description: "按材料、裸线径、线圈尺寸和匝数计算铜线或铝线圆形及矩形线圈的电阻与重量。",
    keywords: ["线圈电阻", "线圈重量", "铜线电阻", "铝线电阻", "电机线圈"],
  },
};

function getToolSeo(toolId) {
  const tool = TOOL_SEO[toolId];
  if (!tool) throw new RangeError(`Unknown tool: ${toolId}`);
  return tool;
}

export function createToolMetadata(toolId) {
  const tool = getToolSeo(toolId);
  const url = `${SITE_URL}${tool.path}`;
  return {
    title: tool.name,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: tool.path },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      url,
      siteName: SITE_NAME,
      title: `${tool.name}｜${SITE_NAME}`,
      description: tool.description,
      images: ["/og.png"],
    },
  };
}

export function createToolSchema(toolId) {
  const tool = getToolSeo(toolId);
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    applicationCategory: "EngineeringApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}${tool.path}`,
    inLanguage: "zh-CN",
    description: tool.description,
  };
}

export const webApplicationSchema = createToolSchema("slot-pole");
