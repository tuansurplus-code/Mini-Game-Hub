export type SeasonalTheme = {
  id: string; name: string; preset: "christmas" | "new-year" | "ramadan" | "custom"; startsAt: string; endsAt: string; announcement: string;
  primary: string; accent: string; heroBackground: string; pageBackground: string; enabled: boolean;
};
export type HomepageTypography = { fontFamily: string; fontSize: number; bold: boolean; italic: boolean; underline: boolean; alignment: "left" | "center" | "right"; headlineSize: number };
export type HomepageGameCard = { id: "spin" | "scratch" | "pick-card"; title: string; description: string; action: string; icon: string; imageUrl: string; color: string; textColor: string; height: number; width: number; cornerRadius: number; textAlignment: "left" | "center" | "right" };
export type ManagedPageSlug = "terms-and-conditions" | "privacy-policy" | "about-us" | "contact-us";
export type ManagedPage = { title: string; body: string; showInFooter: boolean };
export type HomepageContent = {
  header: { brand: string; logoUrl: string; showLogo: boolean; showBrand: boolean; announcement: string; showAnnouncement: boolean; navHome: string; navGames: string; navHow: string; navSignIn: string; navGetStarted: string; showHome: boolean; showGames: boolean; showHow: boolean; showSignIn: boolean; showGetStarted: boolean };
  hero: { eyebrow: string; title: string; highlight: string; description: string; primaryCta: string; secondaryCta: string };
  games: { eyebrow: string; title: string; description: string; columns: number; cards: HomepageGameCard[] };
  how: { eyebrow: string; title: string; steps: { title: string; description: string }[] };
  footer: { copyright: string; termsLabel: string; privacyLabel: string; pageLinksAlignment: "left" | "center" | "right" };
  pages: Record<ManagedPageSlug, ManagedPage>;
  theme: { primary: string; accent: string; heroBackground: string; pageBackground: string };
  sections: { showHero: boolean; showGames: boolean; showHow: boolean; showFooter: boolean }; typography: Record<"header" | "hero" | "games" | "how" | "footer", HomepageTypography>; seasonalThemes: SeasonalTheme[];
};
const defaultTypography = (): HomepageTypography => ({ fontFamily: "Arial, sans-serif", fontSize: 16, bold: false, italic: false, underline: false, alignment: "left", headlineSize: 36 });
const baseCards: HomepageGameCard[] = [
  { id: "spin", title: "Spin the Wheel", description: "Spin the wheel and discover your reward.", action: "Spin Now", icon: "↻", imageUrl: "", color: "#e31b23", textColor: "#ffffff", height: 260, width: 100, cornerRadius: 16, textAlignment: "left" },
  { id: "scratch", title: "Scratch & Reveal", description: "Scratch your card to reveal a surprise.", action: "Play Now", icon: "✦", imageUrl: "", color: "#6f3cff", textColor: "#ffffff", height: 260, width: 100, cornerRadius: 16, textAlignment: "left" },
  { id: "pick-card", title: "Pick Your Reward", description: "Choose one card. One reward is waiting.", action: "Pick Now", icon: "◆", imageUrl: "", color: "#087f73", textColor: "#ffffff", height: 260, width: 100, cornerRadius: 16, textAlignment: "left" },
];
export const GAME_CATALOG = [
  { id: "spin", label: "Spin & Win", icon: "↻" }, { id: "scratch", label: "Scratch & Win", icon: "✦" }, { id: "pick-card", label: "Pick a Card", icon: "◆" },
] as const;
export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  header: { brand: "MINI GAME HUB", logoUrl: "", showLogo: true, showBrand: true, announcement: "Make every campaign more rewarding", showAnnouncement: false, navHome: "Home", navGames: "Games", navHow: "How It Works", navSignIn: "Sign In", navGetStarted: "Get Started", showHome: true, showGames: true, showHow: true, showSignIn: true, showGetStarted: true },
  hero: { eyebrow: "CAMPAIGNS FOR YOUR BUSINESS", title: "Create. Engage.", highlight: "Reward.", description: "Turn Spin & Win, Scratch & Win and Pick a Card into branded campaigns for your customers. Choose a game to start building.", primaryCta: "Explore Games", secondaryCta: "How it works" },
  games: { eyebrow: "GAME ZONE", title: "Choose your game", description: "Choose a game to get started", columns: 3, cards: baseCards },
  how: { eyebrow: "SIMPLE & FAST", title: "How it works", steps: [{ title: "Choose a game", description: "Select Spin, Scratch or Pick a Card for your campaign." }, { title: "Build your campaign", description: "Sign in, customize your game and configure rewards." }, { title: "Publish and share", description: "Review your campaign and share its customer URL." }] },
  footer: { copyright: "© 2026 Mini Game Hub", termsLabel: "Terms & Conditions", privacyLabel: "Privacy", pageLinksAlignment: "center" },
  pages: {
    "terms-and-conditions": { title: "Terms and Conditions", body: "", showInFooter: false },
    "privacy-policy": { title: "Privacy Policy", body: "", showInFooter: false },
    "about-us": { title: "About Us", body: "", showInFooter: false },
    "contact-us": { title: "Contact Us", body: "", showInFooter: false },
  },
  theme: { primary: "#e31b23", accent: "#ff5b61", heroBackground: "#101828", pageBackground: "#f6f7f9" },
  sections: { showHero: true, showGames: true, showHow: true, showFooter: true },
  typography: { header: defaultTypography(), hero: { ...defaultTypography(), headlineSize: 48 }, games: defaultTypography(), how: defaultTypography(), footer: { ...defaultTypography(), fontSize: 13 } }, seasonalThemes: [],
};
export function resolveActiveTheme(content: HomepageContent, now = new Date()): SeasonalTheme | null {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const date = (key: string) => parts.find((part) => part.type === key)?.value ?? "";
  const currentDate = `${date("year")}-${date("month")}-${date("day")}`;
  return content.seasonalThemes.filter((theme) => theme.enabled && theme.startsAt && theme.endsAt && theme.startsAt <= currentDate && currentDate <= theme.endsAt).sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0] ?? null;
}
const colorPattern = /^#[0-9a-f]{6}$/i;
const cleanText = (value: unknown, fallback: string, limit = 240) => typeof value === "string" ? value.trim().slice(0, limit) : fallback;

const richTextTags = new Set(["p", "div", "h1", "h2", "h3", "h4", "br", "hr", "strong", "b", "em", "i", "u", "s", "sub", "sup", "ul", "ol", "li", "blockquote", "pre", "code", "span", "font", "a", "img", "video", "source", "table", "thead", "tbody", "tfoot", "tr", "th", "td"]);
const voidRichTextTags = new Set(["br", "hr", "img", "source"]);
const safeRichTextFonts = ["Arial, sans-serif", "Georgia, serif", "Verdana, sans-serif", "Trebuchet MS, sans-serif", "Tahoma, sans-serif", "system-ui, sans-serif"];
function safeRichTextUrl(value: string, image = false) {
  const compact = value.trim().replace(/[\u0000-\u0020\u007f]+/g, "");
  if (image && /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(compact)) return compact;
  if (/^(?:https?:|mailto:|tel:)/i.test(compact)) return compact;
  if (compact.startsWith("/") && !compact.startsWith("//")) return compact;
  return "";
}
function safeRichTextStyle(value: string) {
  const allowed: string[] = [];
  for (const declaration of value.split(";")) {
    const split = declaration.indexOf(":");
    if (split < 1) continue;
    const key = declaration.slice(0, split).trim().toLowerCase();
    const val = declaration.slice(split + 1).trim();
    if ((key === "color" || key === "background-color") && /^(#[0-9a-f]{3,8}|(?:rgb|rgba)\([0-9.,% ]+\)|[a-z]{3,20})$/i.test(val)) allowed.push(`${key}:${val}`);
    if (key === "font-family" && safeRichTextFonts.some((font) => font.toLowerCase() === val.replace(/['"]/g, "").toLowerCase())) allowed.push(`font-family:${val}`);
    if (key === "font-size" && /^(?:[8-9]|[1-6][0-9]|7[0-2])px$/i.test(val)) allowed.push(`font-size:${val}`);
    if (key === "text-align" && ["left", "center", "right", "justify"].includes(val.toLowerCase())) allowed.push(`text-align:${val.toLowerCase()}`);
  }
  return allowed.join(";");
}
function escapeRichAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function sanitizeRichText(value: unknown, limit = 200000): string {
  if (typeof value !== "string") return "";
  const input = value.slice(0, limit)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|form|textarea|button)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const tokens = input.match(/<[^>]*>|[^<]+/g) ?? [];
  let output = "";
  for (const token of tokens) {
    if (!token.startsWith("<")) { output += token; continue; }
    const closing = /^<\s*\//.test(token);
    const match = token.match(/^<\s*\/?\s*([a-z0-9-]+)/i);
    if (!match) continue;
    const tag = match[1].toLowerCase();
    if (!richTextTags.has(tag)) continue;
    if (closing) {
      if (!voidRichTextTags.has(tag)) output += `</${tag}>`;
      continue;
    }
    const attrText = token.slice(match[0].length, token.length - 1);
    const attributes: string[] = [];
    const attrPattern = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrPattern.exec(attrText))) {
      const name = attr[1].toLowerCase();
      const raw = attr[2] ?? attr[3] ?? attr[4] ?? "";
      if (name === "style") {
        const style = safeRichTextStyle(raw);
        if (style) attributes.push(`style="${escapeRichAttribute(style)}"`);
      } else if (name === "align" && ["left", "center", "right", "justify"].includes(raw.toLowerCase())) {
        attributes.push(`align="${raw.toLowerCase()}"`);
      } else if (name === "href" && tag === "a") {
        const url = safeRichTextUrl(raw);
        if (url) attributes.push(`href="${escapeRichAttribute(url)}"`);
      } else if (name === "src" && ["img", "video", "source"].includes(tag)) {
        const url = safeRichTextUrl(raw, tag !== "video");
        if (url) attributes.push(`src="${escapeRichAttribute(url)}"`);
      } else if (name === "poster" && tag === "video") {
        const url = safeRichTextUrl(raw, true);
        if (url) attributes.push(`poster="${escapeRichAttribute(url)}"`);
      } else if (["alt", "title"].includes(name) && ["a", "img", "video", "span", "td", "th"].includes(tag)) {
        attributes.push(`${name}="${escapeRichAttribute(raw)}"`);
      } else if (["width", "height"].includes(name) && ["img", "video", "table", "td", "th"].includes(tag) && /^\d{1,4}%?$/.test(raw)) {
        attributes.push(`${name}="${raw}"`);
      } else if (name === "controls" && tag === "video") {
        attributes.push("controls");
      } else if (name === "colspan" && ["td", "th"].includes(tag) && /^\d{1,2}$/.test(raw)) {
        attributes.push(`colspan="${raw}"`);
      } else if (name === "rowspan" && ["td", "th"].includes(tag) && /^\d{1,2}$/.test(raw)) {
        attributes.push(`rowspan="${raw}"`);
      }
    }
    output += `<${tag}${attributes.length ? ` ${attributes.join(" ")}` : ""}${voidRichTextTags.has(tag) ? ">" : ">"}`;
  }
  return output;
}
const cleanColor = (value: unknown, fallback: string) => typeof value === "string" && colorPattern.test(value) ? value : fallback;
const cleanNumber = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
function normalizeTypography(raw: unknown, fallback: HomepageTypography): HomepageTypography {
  const v = raw && typeof raw === "object" ? raw as Partial<HomepageTypography> : {};
  const families = ["Arial, sans-serif", "Georgia, serif", "Verdana, sans-serif", "Trebuchet MS, sans-serif", "Tahoma, sans-serif", "system-ui, sans-serif"];
  return { fontFamily: families.includes(v.fontFamily ?? "") ? v.fontFamily! : fallback.fontFamily, fontSize: cleanNumber(v.fontSize, fallback.fontSize, 10, 48), bold: v.bold === true, italic: v.italic === true, underline: v.underline === true, alignment: ["left", "center", "right"].includes(v.alignment ?? "") ? v.alignment! : fallback.alignment, headlineSize: cleanNumber(v.headlineSize, fallback.headlineSize, 20, 72) };
}
export function normalizeHomepageContent(input: unknown): HomepageContent {
  const value = input && typeof input === "object" ? input as Partial<HomepageContent> : {}; const base = DEFAULT_HOMEPAGE_CONTENT;
  const seasonal = Array.isArray(value.seasonalThemes) ? value.seasonalThemes.slice(0, 12) : [];
  const cardInput = Array.isArray(value.games?.cards) ? value.games!.cards!.slice(0, 12) : base.games.cards;
  const validIds = new Set<string>();
  const cards = cardInput.flatMap((raw) => {
    const card = raw as Partial<HomepageGameCard>; const id = card.id ?? baseCards[cardInput.indexOf(raw)]?.id; const defaults = baseCards.find((item) => item.id === id);
    if (!defaults || validIds.has(id!)) return []; validIds.add(id!);
    return [{ id: defaults.id, title: cleanText(card.title, defaults.title, 100), description: cleanText(card.description, defaults.description, 240), action: cleanText(card.action, defaults.action, 50), icon: cleanText(card.icon, defaults.icon, 8), imageUrl: cleanText(card.imageUrl, "", 1000), color: cleanColor(card.color, defaults.color), textColor: cleanColor(card.textColor, defaults.textColor), height: cleanNumber(card.height, defaults.height, 140, 600), width: cleanNumber(card.width, defaults.width, 50, 100), cornerRadius: cleanNumber(card.cornerRadius, defaults.cornerRadius, 0, 48), textAlignment: ["left", "center", "right"].includes(card.textAlignment ?? "") ? card.textAlignment! : defaults.textAlignment }];
  });
  const typ = value.typography as Partial<HomepageContent["typography"]> | undefined;
  return {
    header: { brand: cleanText(value.header?.brand, base.header.brand, 60), logoUrl: cleanText(value.header?.logoUrl, "", 1000), showLogo: value.header?.showLogo !== false, showBrand: value.header?.showBrand !== false, announcement: cleanText(value.header?.announcement, base.header.announcement), showAnnouncement: value.header?.showAnnouncement === true, navHome: cleanText(value.header?.navHome, base.header.navHome, 40), navGames: cleanText(value.header?.navGames, base.header.navGames, 40), navHow: cleanText(value.header?.navHow, base.header.navHow, 50), navSignIn: cleanText(value.header?.navSignIn, base.header.navSignIn, 40), navGetStarted: cleanText(value.header?.navGetStarted, base.header.navGetStarted, 40), showHome: value.header?.showHome !== false, showGames: value.header?.showGames !== false, showHow: value.header?.showHow !== false, showSignIn: value.header?.showSignIn !== false, showGetStarted: value.header?.showGetStarted !== false },
    hero: { eyebrow: cleanText(value.hero?.eyebrow, base.hero.eyebrow, 80), title: cleanText(value.hero?.title, base.hero.title, 100), highlight: cleanText(value.hero?.highlight, base.hero.highlight, 60), description: cleanText(value.hero?.description, base.hero.description, 500), primaryCta: cleanText(value.hero?.primaryCta, base.hero.primaryCta, 50), secondaryCta: cleanText(value.hero?.secondaryCta, base.hero.secondaryCta, 50) },
    games: { eyebrow: cleanText(value.games?.eyebrow, base.games.eyebrow, 80), title: cleanText(value.games?.title, base.games.title, 100), description: cleanText(value.games?.description, base.games.description, 100), columns: Math.round(cleanNumber(value.games?.columns, base.games.columns, 1, 4)), cards },
    how: { eyebrow: cleanText(value.how?.eyebrow, base.how.eyebrow, 80), title: cleanText(value.how?.title, base.how.title, 100), steps: base.how.steps.map((step, index) => ({ title: cleanText(value.how?.steps?.[index]?.title, step.title, 100), description: cleanText(value.how?.steps?.[index]?.description, step.description, 240) })) },
    footer: { copyright: cleanText(value.footer?.copyright, base.footer.copyright, 120), termsLabel: cleanText(value.footer?.termsLabel, base.footer.termsLabel, 60), privacyLabel: cleanText(value.footer?.privacyLabel, base.footer.privacyLabel, 60), pageLinksAlignment: ["left", "center", "right"].includes(value.footer?.pageLinksAlignment ?? "") ? value.footer!.pageLinksAlignment! : base.footer.pageLinksAlignment },
    pages: {
      "terms-and-conditions": { title: cleanText(value.pages?.["terms-and-conditions"]?.title, base.pages["terms-and-conditions"].title, 100), body: sanitizeRichText(value.pages?.["terms-and-conditions"]?.body), showInFooter: value.pages?.["terms-and-conditions"]?.showInFooter === true },
      "privacy-policy": { title: cleanText(value.pages?.["privacy-policy"]?.title, base.pages["privacy-policy"].title, 100), body: sanitizeRichText(value.pages?.["privacy-policy"]?.body), showInFooter: value.pages?.["privacy-policy"]?.showInFooter === true },
      "about-us": { title: cleanText(value.pages?.["about-us"]?.title, base.pages["about-us"].title, 100), body: sanitizeRichText(value.pages?.["about-us"]?.body), showInFooter: value.pages?.["about-us"]?.showInFooter === true },
      "contact-us": { title: cleanText(value.pages?.["contact-us"]?.title, base.pages["contact-us"].title, 100), body: sanitizeRichText(value.pages?.["contact-us"]?.body), showInFooter: value.pages?.["contact-us"]?.showInFooter === true },
    },
    theme: { primary: cleanColor(value.theme?.primary, base.theme.primary), accent: cleanColor(value.theme?.accent, base.theme.accent), heroBackground: cleanColor(value.theme?.heroBackground, base.theme.heroBackground), pageBackground: cleanColor(value.theme?.pageBackground, base.theme.pageBackground) },
    sections: { showHero: value.sections?.showHero !== false, showGames: value.sections?.showGames !== false, showHow: value.sections?.showHow !== false, showFooter: value.sections?.showFooter !== false },
    typography: { header: normalizeTypography(typ?.header, base.typography.header), hero: normalizeTypography(typ?.hero, base.typography.hero), games: normalizeTypography(typ?.games, base.typography.games), how: normalizeTypography(typ?.how, base.typography.how), footer: normalizeTypography(typ?.footer, base.typography.footer) },
    seasonalThemes: seasonal.map((raw, index) => { const theme = raw as Partial<SeasonalTheme>; const preset = ["christmas", "new-year", "ramadan", "custom"].includes(theme.preset ?? "") ? theme.preset! : "custom"; return { id: cleanText(theme.id, `season-${index}`, 40), name: cleanText(theme.name, "Seasonal theme", 60), preset, startsAt: cleanText(theme.startsAt, "", 30), endsAt: cleanText(theme.endsAt, "", 30), announcement: cleanText(theme.announcement, "", 160), primary: cleanColor(theme.primary, base.theme.primary), accent: cleanColor(theme.accent, base.theme.accent), heroBackground: cleanColor(theme.heroBackground, base.theme.heroBackground), pageBackground: cleanColor(theme.pageBackground, base.theme.pageBackground), enabled: theme.enabled === true }; }),
  };
}
