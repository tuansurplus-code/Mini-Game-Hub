export const HOMEPAGE_SECTION_ORDER = ["hero", "benefits", "games", "how", "features", "pricing", "cta"] as const;
export type HomepageSection = typeof HOMEPAGE_SECTION_ORDER[number];
export type HomepageFeatureItem = { id: string; icon: string; title: string; description: string };
export type HomepagePlan = { id: string; slug: string; name: string; description: string; monthly_price_lkr: number; max_active_campaigns: number | null; max_monthly_participants: number | null; max_team_members: number | null };
export type HomepageCatalogGame = { id: string; label: string; description: string; active: boolean; icon: string };
export type SeasonalTheme = {
  id: string; name: string; preset: "christmas" | "new-year" | "ramadan" | "wesak" | "custom"; startsAt: string; endsAt: string; announcement: string;
  primary: string; accent: string; heroBackground: string; pageBackground: string; enabled: boolean;
};
export type HomepageTypography = { fontFamily: string; fontSize: number; bold: boolean; italic: boolean; underline: boolean; alignment: "left" | "center" | "right"; headlineSize: number };
export type HomepageGameCard = { id: string; title: string; description: string; action: string; icon: string; imageUrl: string; color: string; textColor: string; height: number; width: number; cornerRadius: number; textAlignment: "left" | "center" | "right" };
export type HomepageContent = {
  header: { brand: string; logoUrl: string; showLogo: boolean; showBrand: boolean; announcement: string; showAnnouncement: boolean; navHome: string; navGames: string; navHow: string; navSignIn: string; navGetStarted: string; showHome: boolean; showGames: boolean; showHow: boolean; showSignIn: boolean; showGetStarted: boolean; navPricing: string; showPricing: boolean };
  hero: { eyebrow: string; title: string; highlight: string; description: string; primaryCta: string; secondaryCta: string; backgroundImageUrl: string; primaryTarget: "signup" | "games" | "how"; secondaryTarget: "signup" | "games" | "how" };
  games: { eyebrow: string; title: string; description: string; columns: number; cards: HomepageGameCard[] };
  benefits: { items: HomepageFeatureItem[] };
  features: { eyebrow: string; title: string; description: string; items: HomepageFeatureItem[] };
  pricing: { eyebrow: string; title: string; description: string; buttonText: string; featuredPlanId: string; hiddenPlanIds: string[] };
  cta: { title: string; description: string; buttonText: string; target: "signup" | "games" | "how" };
  layout: { sectionOrder: HomepageSection[]; heroLayout: "split" | "center"; useSiteFonts: boolean };
  how: { eyebrow: string; title: string; steps: { title: string; description: string }[] };
  footer: { copyright: string; termsLabel: string; privacyLabel: string; pages: { slug: "terms" | "privacy" | "about" | "contact"; label: string; enabled: boolean }[]; alignment: "left" | "center" | "right" };
  theme: { primary: string; accent: string; heroBackground: string; pageBackground: string };
  sections: { showHero: boolean; showGames: boolean; showHow: boolean; showFooter: boolean; showBenefits: boolean; showFeatures: boolean; showPricing: boolean; showCta: boolean }; typography: Record<"header" | "hero" | "games" | "how" | "footer" | "benefits" | "features" | "pricing" | "cta", HomepageTypography>; seasonalThemes: SeasonalTheme[];
};
export type SavedHomepagePage = { id: string; name: string; kind: "custom" | "wesak" | "christmas" | "ramadan" | "new-year"; content: HomepageContent; startsAt: string; endsAt: string; scheduled: boolean; published: boolean; createdAt: string; updatedAt: string };
export const TEMPLATE_ARTWORK_CROPS = {
  wesak: { hero: [775, 58, 165, 160], spin: [146, 252, 198, 162], scratch: [392, 252, 188, 162], "pick-card": [630, 252, 180, 162] },
  christmas: { hero: [635, 50, 270, 210], spin: [80, 289, 241, 123], scratch: [370, 288, 226, 125], "pick-card": [640, 288, 239, 125], sleigh: [390, 543, 265, 52], "pine-left": [0, 0, 90, 75], "pine-right": [870, 0, 90, 75] },
  ramadan: { hero: [650, 35, 280, 205], spin: [151, 257, 198, 155], scratch: [390, 257, 184, 155], "pick-card": [617, 257, 187, 155] },
  "new-year": { hero: [515, 25, 445, 255], spin: [88, 291, 246, 136], scratch: [362, 291, 237, 136], "pick-card": [627, 291, 252, 136] },
} as const;
export function getTemplateArtworkStyle(url: string): Record<string, string> | null {
  const christmasGame = url.match(/^\/template-previews\/(?:christmas\.svg|christmas-games-v2\.webp)\?crop=(spin|scratch|pick-card)$/);
  if (christmasGame) return { backgroundImage:'url("/template-previews/christmas-games-v2.webp")', backgroundSize:"300% 100%", backgroundPosition:{spin:"0% center",scratch:"50% center","pick-card":"100% center"}[christmasGame[1]]!, backgroundRepeat:"no-repeat", aspectRatio:"1/1" };
  const match = url.match(/^\/template-previews\/(wesak|christmas|ramadan|new-year)\.svg\?crop=(hero|spin|scratch|pick-card|sleigh|pine-left|pine-right)$/);
  if (!match) return null;
  const [, kind, area] = match;
  const box = TEMPLATE_ARTWORK_CROPS[kind as keyof typeof TEMPLATE_ARTWORK_CROPS][area as keyof typeof TEMPLATE_ARTWORK_CROPS[keyof typeof TEMPLATE_ARTWORK_CROPS]];
  if (!box) return null;
  const [x, y, width, height] = box;
  return {
    backgroundImage: `url("/template-previews/${kind}.svg")`,
    backgroundSize: `${(960 / width) * 100}% auto`,
    backgroundPosition: `${(x / (960 - width)) * 100}% ${(y / (601 - height)) * 100}%`,
    backgroundRepeat: "no-repeat",
    aspectRatio: `${width}/${height}`,
  };
}
export type HomepageSiteTheme = { preset: "clean-white" | "soft-sky" | "sage-cream" | "warm-sunset" | "lavender-mist" | "custom"; colors: { primary: string; accent: string; heroBackground: string; pageBackground: string; cardBackground: string; footerBackground: string }; fonts: { header: string; body: string; footer: string } };
export type HomepageAnalyticsSettings = { gtmEnabled: boolean; gtmContainerId: string };
export type HomepageManagerData = { pages: SavedHomepagePage[]; livePageId: string | null; defaultPageId: string | null; siteTheme: HomepageSiteTheme; analytics: HomepageAnalyticsSettings };
export const DEFAULT_SITE_THEME: HomepageSiteTheme = { preset: "clean-white", colors: { primary: "#6f3cff", accent: "#ed4b9b", heroBackground: "#f3efff", pageBackground: "#ffffff", cardBackground: "#ffffff", footerBackground: "#131b3f" }, fonts: { header: "Arial, sans-serif", body: "Arial, sans-serif", footer: "Arial, sans-serif" } };
export const DEFAULT_HOMEPAGE_ANALYTICS: HomepageAnalyticsSettings = { gtmEnabled: false, gtmContainerId: "" };
export const DEFAULT_HOMEPAGE_MANAGER: HomepageManagerData = { pages: [], livePageId: null, defaultPageId: null, siteTheme: DEFAULT_SITE_THEME, analytics: DEFAULT_HOMEPAGE_ANALYTICS };
export function normalizeHomepageManager(input: unknown): HomepageManagerData {
  const raw = input && typeof input === "object" ? input as Partial<HomepageManagerData> : {};
  const manager = raw.siteTheme && typeof raw.siteTheme === "object" ? raw.siteTheme : DEFAULT_SITE_THEME;
  const color = (value: unknown, fallback: string) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const fonts = ["Arial, sans-serif", "Georgia, serif", "Verdana, sans-serif", "Trebuchet MS, sans-serif", "Tahoma, sans-serif", "system-ui, sans-serif"];
  const siteTheme: HomepageSiteTheme = {
    preset: ["clean-white", "soft-sky", "sage-cream", "warm-sunset", "lavender-mist", "custom"].includes(manager.preset ?? "") ? manager.preset! : "clean-white",
    colors: {
      primary: color(manager.colors?.primary, DEFAULT_SITE_THEME.colors.primary), accent: color(manager.colors?.accent, DEFAULT_SITE_THEME.colors.accent),
      heroBackground: color(manager.colors?.heroBackground, DEFAULT_SITE_THEME.colors.heroBackground), pageBackground: color(manager.colors?.pageBackground, DEFAULT_SITE_THEME.colors.pageBackground),
      cardBackground: color(manager.colors?.cardBackground, DEFAULT_SITE_THEME.colors.cardBackground), footerBackground: color(manager.colors?.footerBackground, DEFAULT_SITE_THEME.colors.footerBackground),
    },
    fonts: { header: fonts.includes(manager.fonts?.header ?? "") ? manager.fonts!.header : DEFAULT_SITE_THEME.fonts.header, body: fonts.includes(manager.fonts?.body ?? "") ? manager.fonts!.body : DEFAULT_SITE_THEME.fonts.body, footer: fonts.includes(manager.fonts?.footer ?? "") ? manager.fonts!.footer : DEFAULT_SITE_THEME.fonts.footer },
  };
  const pages = Array.isArray(raw.pages) ? raw.pages.slice(0, 100).flatMap((page) => {
    if (!page || typeof page !== "object" || typeof page.id !== "string" || typeof page.name !== "string") return [];
    const kind = ["custom", "wesak", "christmas", "ramadan", "new-year"].includes(page.kind) ? page.kind : "custom";
    return [{ id: page.id.slice(0, 64), name: page.name.trim().slice(0, 80), kind, content: normalizeHomepageContent(page.content), startsAt: typeof page.startsAt === "string" ? page.startsAt.slice(0, 10) : "", endsAt: typeof page.endsAt === "string" ? page.endsAt.slice(0, 10) : "", scheduled: page.scheduled === true, published: page.published === true, createdAt: typeof page.createdAt === "string" ? page.createdAt : new Date(0).toISOString(), updatedAt: typeof page.updatedAt === "string" ? page.updatedAt : new Date(0).toISOString() }];
  }) : [];
  const id = (value: unknown) => typeof value === "string" && pages.some((page) => page.id === value) ? value : null;
  const rawAnalytics = raw.analytics && typeof raw.analytics === "object" ? raw.analytics as Partial<HomepageAnalyticsSettings> : {};
  const gtmContainerId = typeof rawAnalytics.gtmContainerId === "string" && /^GTM-[A-Z0-9]+$/.test(rawAnalytics.gtmContainerId.trim().toUpperCase()) ? rawAnalytics.gtmContainerId.trim().toUpperCase() : "";
  const analytics: HomepageAnalyticsSettings = { gtmEnabled: rawAnalytics.gtmEnabled === true && Boolean(gtmContainerId), gtmContainerId };
  return { pages, livePageId: id(raw.livePageId), defaultPageId: id(raw.defaultPageId), siteTheme, analytics };
}
const defaultTypography = (): HomepageTypography => ({ fontFamily: "Arial, sans-serif", fontSize: 16, bold: false, italic: false, underline: false, alignment: "left", headlineSize: 36 });
const baseCards: HomepageGameCard[] = [
  { id: "spin", title: "Spin & Win", description: "Spin the wheel and discover your reward.", action: "Explore Game", icon: "↻", imageUrl: "", color: "#ffffff", textColor: "#142044", height: 350, width: 100, cornerRadius: 16, textAlignment: "left" },
  { id: "scratch", title: "Scratch & Win", description: "Scratch your card to reveal a surprise.", action: "Explore Game", icon: "✦", imageUrl: "", color: "#ffffff", textColor: "#142044", height: 350, width: 100, cornerRadius: 16, textAlignment: "left" },
  { id: "pick-card", title: "Pick a Card", description: "Choose one card. One reward is waiting.", action: "Explore Game", icon: "◆", imageUrl: "", color: "#ffffff", textColor: "#142044", height: 350, width: 100, cornerRadius: 16, textAlignment: "left" },
];
export const GAME_CATALOG = [
  { id: "spin", label: "Spin & Win", icon: "↻" }, { id: "scratch", label: "Scratch & Win", icon: "✦" }, { id: "pick-card", label: "Pick a Card", icon: "◆" },
] as const;
export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  header: { brand: "Mini Game Hub", logoUrl: "", showLogo: true, showBrand: true, announcement: "Make every campaign more rewarding", showAnnouncement: false, navHome: "Home", navGames: "Games", navHow: "How It Works", navSignIn: "Sign In", navGetStarted: "Get Started", showHome: false, showGames: true, showHow: true, showSignIn: true, showGetStarted: true, navPricing: "Pricing", showPricing: true },
  hero: { eyebrow: "PLAYFUL CAMPAIGNS. REAL RESULTS.", title: "Turn customers into players.", highlight: "Turn play into sales.", description: "Create branded games, capture leads and reward your customers—all in one place.", primaryCta: "Create Your Campaign", secondaryCta: "Explore Games", backgroundImageUrl: "/homepage/campaign-games.webp", primaryTarget: "signup", secondaryTarget: "games" },
  games: { eyebrow: "GAME ZONE", title: "Pick a game. Make it yours.", description: "Engaging ways to power your next promotion", columns: 3, cards: baseCards },
  how: { eyebrow: "SIMPLE & FAST", title: "Launch in three simple steps", steps: [{ title: "Choose a game", description: "Select Spin, Scratch or Pick a Card for your campaign." }, { title: "Build your campaign", description: "Sign in, customize your game and configure rewards." }, { title: "Publish and share", description: "Review your campaign and share its customer URL." }] },
  footer: { copyright: "© 2026 Mini Game Hub", termsLabel: "Terms & Conditions", privacyLabel: "Privacy", pages: [{ slug: "terms", label: "Terms & Conditions", enabled: true }, { slug: "privacy", label: "Privacy Policy", enabled: true }, { slug: "about", label: "About Us", enabled: true }, { slug: "contact", label: "Contact Us", enabled: true }], alignment: "center" },
  theme: { primary: "#6f3cff", accent: "#ed4b9b", heroBackground: "#f3efff", pageBackground: "#ffffff" },
  benefits: { items: [{ id: "no-code", icon: "code", title: "No coding needed", description: "" }, { id: "branding", icon: "palette", title: "Custom branding", description: "" }, { id: "analytics", icon: "chart", title: "Campaign analytics", description: "" }] },
  features: { eyebrow: "MADE FOR GROWTH", title: "Built for your business", description: "Everything you need to run successful game campaigns.", items: [{ id: "leads", icon: "users", title: "Capture leads", description: "Grow your customer list while people play." }, { id: "rewards", icon: "gift", title: "Reward customers", description: "Offer discounts, prizes and exclusive deals." }, { id: "brand", icon: "palette", title: "Match your brand", description: "Customize games to look and feel like you." }, { id: "results", icon: "chart", title: "Measure results", description: "Track engagement and campaign performance." }] },
  pricing: { eyebrow: "PLANS & PRICING", title: "A plan for every campaign", description: "Simple plans to support your goals.", buttonText: "Get started", featuredPlanId: "", hiddenPlanIds: [] },
  cta: { title: "Ready to launch your next campaign?", description: "Create engaging games, capture leads and grow your business.", buttonText: "Create Your Campaign", target: "signup" },
  layout: { sectionOrder: [...HOMEPAGE_SECTION_ORDER], heroLayout: "split", useSiteFonts:true },
  sections: { showHero: true, showGames: true, showHow: true, showFooter: true, showBenefits: true, showFeatures: true, showPricing: true, showCta: true },
  typography: { header: defaultTypography(), hero: { ...defaultTypography(), headlineSize: 56 }, games: { ...defaultTypography(), alignment:"center" }, how: { ...defaultTypography(), alignment:"center" }, footer: { ...defaultTypography(), fontSize: 13 }, benefits: defaultTypography(), features: { ...defaultTypography(), alignment: "center" }, pricing: { ...defaultTypography(), alignment: "center" }, cta: defaultTypography() }, seasonalThemes: [],
};
export function resolveActiveTheme(content: HomepageContent, now = new Date()): SeasonalTheme | null {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const date = (key: string) => parts.find((part) => part.type === key)?.value ?? "";
  const currentDate = `${date("year")}-${date("month")}-${date("day")}`;
  return content.seasonalThemes.filter((theme) => theme.enabled && theme.startsAt && theme.endsAt && theme.startsAt <= currentDate && currentDate <= theme.endsAt).sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0] ?? null;
}
const colorPattern = /^#[0-9a-f]{6}$/i;
const cleanText = (value: unknown, fallback: string, limit = 240) => typeof value === "string" ? value.trim().slice(0, limit) : fallback;
const cleanColor = (value: unknown, fallback: string) => typeof value === "string" && colorPattern.test(value) ? value : fallback;
const cleanNumber = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
function normalizeTypography(raw: unknown, fallback: HomepageTypography): HomepageTypography {
  const v = raw && typeof raw === "object" ? raw as Partial<HomepageTypography> : {};
  const families = ["Arial, sans-serif", "Georgia, serif", "Verdana, sans-serif", "Trebuchet MS, sans-serif", "Tahoma, sans-serif", "system-ui, sans-serif"];
  return { fontFamily: families.includes(v.fontFamily ?? "") ? v.fontFamily! : fallback.fontFamily, fontSize: cleanNumber(v.fontSize, fallback.fontSize, 10, 48), bold: v.bold === true, italic: v.italic === true, underline: v.underline === true, alignment: ["left", "center", "right"].includes(v.alignment ?? "") ? v.alignment! : fallback.alignment, headlineSize: cleanNumber(v.headlineSize, fallback.headlineSize, 20, 72) };
}
function normalizeTarget(value: unknown, fallback: "signup" | "games" | "how"): "signup" | "games" | "how" { return value === "signup" || value === "games" || value === "how" ? value : fallback; }
function normalizeSectionOrder(value: unknown): HomepageSection[] {
  const order = Array.isArray(value) ? value.filter((item): item is HomepageSection => HOMEPAGE_SECTION_ORDER.includes(item)) : [];
  return [...new Set([...order, ...HOMEPAGE_SECTION_ORDER])];
}
function normalizeItems(value: unknown, fallback: HomepageFeatureItem[]): HomepageFeatureItem[] {
  if (!Array.isArray(value)) return structuredClone(fallback);
  const ids = new Set<string>();
  return value.slice(0, 12).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const id = cleanText(item.id, `item-${index}`, 64); if (ids.has(id)) return []; ids.add(id);
    return [{ id, icon: cleanText(item.icon, "gift", 30), title: cleanText(item.title, "", 100), description: cleanText(item.description, "", 240) }];
  });
}
export function normalizeHomepageContent(input: unknown): HomepageContent {
  const value = input && typeof input === "object" ? input as Partial<HomepageContent> : {}; const base = DEFAULT_HOMEPAGE_CONTENT;
  const seasonal = Array.isArray(value.seasonalThemes) ? value.seasonalThemes.slice(0, 12) : [];
  const cardInput = Array.isArray(value.games?.cards) ? value.games!.cards!.slice(0, 100) : base.games.cards;
  const validIds = new Set<string>();
  const cards = cardInput.flatMap((raw) => {
    const card = raw as Partial<HomepageGameCard>; const id = card.id ?? baseCards[cardInput.indexOf(raw)]?.id; const defaults = baseCards.find((item) => item.id === id) ?? (typeof id === "string" && /^[a-z0-9-]{1,40}$/.test(id) ? { ...baseCards[0], id, title: id, icon: "🎮", imageUrl: "" } : null);
    if (!defaults || validIds.has(id!)) return []; validIds.add(id!);
    return [{ id: defaults.id, title: cleanText(card.title, defaults.title, 100), description: cleanText(card.description, defaults.description, 240), action: cleanText(card.action, defaults.action, 50), icon: cleanText(card.icon, defaults.icon, 8), imageUrl: cleanText(card.imageUrl, "", 1000), color: cleanColor(card.color, defaults.color), textColor: cleanColor(card.textColor, defaults.textColor), height: cleanNumber(card.height, defaults.height, 140, 600), width: cleanNumber(card.width, defaults.width, 50, 100), cornerRadius: cleanNumber(card.cornerRadius, defaults.cornerRadius, 0, 48), textAlignment: ["left", "center", "right"].includes(card.textAlignment ?? "") ? card.textAlignment! : defaults.textAlignment }];
  });
  const typ = value.typography as Partial<HomepageContent["typography"]> | undefined;
  return {
    header: { brand: cleanText(value.header?.brand, base.header.brand, 60), logoUrl: cleanText(value.header?.logoUrl, "", 1000), showLogo: value.header?.showLogo !== false, showBrand: value.header?.showBrand !== false, announcement: cleanText(value.header?.announcement, base.header.announcement), showAnnouncement: value.header?.showAnnouncement === true, navHome: cleanText(value.header?.navHome, base.header.navHome, 40), navGames: cleanText(value.header?.navGames, base.header.navGames, 40), navHow: cleanText(value.header?.navHow, base.header.navHow, 50), navSignIn: cleanText(value.header?.navSignIn, base.header.navSignIn, 40), navGetStarted: cleanText(value.header?.navGetStarted, base.header.navGetStarted, 40), showHome: typeof value.header?.showHome === "boolean" ? value.header.showHome : base.header.showHome, showGames: value.header?.showGames !== false, showHow: value.header?.showHow !== false, showSignIn: value.header?.showSignIn !== false, showGetStarted: value.header?.showGetStarted !== false, navPricing: cleanText(value.header?.navPricing, base.header.navPricing, 40), showPricing: value.header?.showPricing !== false },
    hero: { eyebrow: cleanText(value.hero?.eyebrow, base.hero.eyebrow, 80), title: cleanText(value.hero?.title, base.hero.title, 100), highlight: cleanText(value.hero?.highlight, base.hero.highlight, 60), description: cleanText(value.hero?.description, base.hero.description, 500), primaryCta: cleanText(value.hero?.primaryCta, base.hero.primaryCta, 50), secondaryCta: cleanText(value.hero?.secondaryCta, base.hero.secondaryCta, 50), backgroundImageUrl: cleanText(value.hero?.backgroundImageUrl, base.hero.backgroundImageUrl, 1000), primaryTarget: normalizeTarget(value.hero?.primaryTarget, value.hero ? "games" : "signup"), secondaryTarget: normalizeTarget(value.hero?.secondaryTarget, value.hero ? "how" : "games") },
    games: { eyebrow: cleanText(value.games?.eyebrow, base.games.eyebrow, 80), title: cleanText(value.games?.title, base.games.title, 100), description: cleanText(value.games?.description, base.games.description, 100), columns: Math.round(cleanNumber(value.games?.columns, base.games.columns, 1, 4)), cards },
    benefits: { items: normalizeItems(value.benefits?.items, base.benefits.items) },
    features: { eyebrow: cleanText(value.features?.eyebrow, base.features.eyebrow, 80), title: cleanText(value.features?.title, base.features.title, 100), description: cleanText(value.features?.description, base.features.description, 500), items: normalizeItems(value.features?.items, base.features.items) },
    pricing: { eyebrow: cleanText(value.pricing?.eyebrow, base.pricing.eyebrow, 80), title: cleanText(value.pricing?.title, base.pricing.title, 100), description: cleanText(value.pricing?.description, base.pricing.description, 500), buttonText: cleanText(value.pricing?.buttonText, base.pricing.buttonText, 50), featuredPlanId: cleanText(value.pricing?.featuredPlanId, "", 64), hiddenPlanIds: Array.isArray(value.pricing?.hiddenPlanIds) ? [...new Set(value.pricing.hiddenPlanIds.filter(id => typeof id === "string").map(id => id.slice(0, 64)))].slice(0, 100) : [] },
    cta: { title: cleanText(value.cta?.title, base.cta.title, 100), description: cleanText(value.cta?.description, base.cta.description, 500), buttonText: cleanText(value.cta?.buttonText, base.cta.buttonText, 50), target: normalizeTarget(value.cta?.target, "signup") },
    layout: { sectionOrder: normalizeSectionOrder(value.layout?.sectionOrder), heroLayout: value.layout?.heroLayout === "center" ? "center" : "split", useSiteFonts:value.layout?.useSiteFonts !== false },
    how: { eyebrow: cleanText(value.how?.eyebrow, base.how.eyebrow, 80), title: cleanText(value.how?.title, base.how.title, 100), steps: base.how.steps.map((step, index) => ({ title: cleanText(value.how?.steps?.[index]?.title, step.title, 100), description: cleanText(value.how?.steps?.[index]?.description, step.description, 240) })) },
    footer: { copyright: cleanText(value.footer?.copyright, base.footer.copyright, 120), termsLabel: cleanText(value.footer?.termsLabel, base.footer.termsLabel, 60), privacyLabel: cleanText(value.footer?.privacyLabel, base.footer.privacyLabel, 60), pages: Array.isArray(value.footer?.pages) ? value.footer!.pages!.slice(0, 4).flatMap((item) => item && ["terms", "privacy", "about", "contact"].includes(item.slug) ? [{ slug: item.slug, label: cleanText(item.label, item.slug, 60), enabled: item.enabled === true }] : []) : base.footer.pages, alignment: ["left", "center", "right"].includes(value.footer?.alignment ?? "") ? value.footer!.alignment! : base.footer.alignment },
    theme: { primary: cleanColor(value.theme?.primary, base.theme.primary), accent: cleanColor(value.theme?.accent, base.theme.accent), heroBackground: cleanColor(value.theme?.heroBackground, base.theme.heroBackground), pageBackground: cleanColor(value.theme?.pageBackground, base.theme.pageBackground) },
    sections: { showHero: value.sections?.showHero !== false, showGames: value.sections?.showGames !== false, showHow: value.sections?.showHow !== false, showFooter: value.sections?.showFooter !== false, showBenefits: value.sections?.showBenefits !== false, showFeatures: value.sections?.showFeatures !== false, showPricing: value.sections?.showPricing !== false, showCta: value.sections?.showCta !== false },
    typography: { header: normalizeTypography(typ?.header, base.typography.header), hero: normalizeTypography(typ?.hero, base.typography.hero), games: normalizeTypography(typ?.games, base.typography.games), how: normalizeTypography(typ?.how, base.typography.how), footer: normalizeTypography(typ?.footer, base.typography.footer), benefits: normalizeTypography(typ?.benefits, base.typography.benefits), features: normalizeTypography(typ?.features, base.typography.features), pricing: normalizeTypography(typ?.pricing, base.typography.pricing), cta: normalizeTypography(typ?.cta, base.typography.cta) },
    seasonalThemes: seasonal.map((raw, index) => { const theme = raw as Partial<SeasonalTheme>; const preset = ["christmas", "new-year", "ramadan", "wesak", "custom"].includes(theme.preset ?? "") ? theme.preset! : "custom"; return { id: cleanText(theme.id, `season-${index}`, 40), name: cleanText(theme.name, "Seasonal theme", 60), preset, startsAt: cleanText(theme.startsAt, "", 30), endsAt: cleanText(theme.endsAt, "", 30), announcement: cleanText(theme.announcement, "", 160), primary: cleanColor(theme.primary, base.theme.primary), accent: cleanColor(theme.accent, base.theme.accent), heroBackground: cleanColor(theme.heroBackground, base.theme.heroBackground), pageBackground: cleanColor(theme.pageBackground, base.theme.pageBackground), enabled: theme.enabled === true }; }),
  };
}

export function applyHomepageFonts(content: HomepageContent, theme?: HomepageSiteTheme): HomepageContent {
  if (!theme || !content.layout.useSiteFonts) return content;
  const typography = { ...content.typography };
  for (const key of Object.keys(typography) as (keyof HomepageContent["typography"])[]) typography[key] = { ...typography[key], fontFamily:key === "header" ? theme.fonts.header : key === "footer" ? theme.fonts.footer : theme.fonts.body };
  return { ...content, typography };
}
