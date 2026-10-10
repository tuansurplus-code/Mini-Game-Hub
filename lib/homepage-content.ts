export type SeasonalTheme = {
  id: string;
  name: string;
  preset: "christmas" | "new-year" | "ramadan" | "custom";
  startsAt: string;
  endsAt: string;
  announcement: string;
  primary: string;
  accent: string;
  heroBackground: string;
  pageBackground: string;
  enabled: boolean;
};

export type HomepageContent = {
  header: { brand: string; announcement: string; showAnnouncement: boolean };
  hero: { eyebrow: string; title: string; highlight: string; description: string; primaryCta: string; secondaryCta: string };
  games: { eyebrow: string; title: string; description: string; cards: { title: string; description: string; action: string }[] };
  how: { eyebrow: string; title: string; steps: { title: string; description: string }[] };
  footer: { copyright: string; termsLabel: string; privacyLabel: string };
  theme: { primary: string; accent: string; heroBackground: string; pageBackground: string };
  seasonalThemes: SeasonalTheme[];
};

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  header: { brand: "MINI GAME HUB", announcement: "Make every campaign more rewarding", showAnnouncement: false },
  hero: {
    eyebrow: "CAMPAIGNS FOR YOUR BUSINESS", title: "Create. Engage.", highlight: "Reward.",
    description: "Turn Spin & Win, Scratch & Win and Pick a Card into branded campaigns for your customers. Choose a game to start building.",
    primaryCta: "Explore Games", secondaryCta: "How it works",
  },
  games: {
    eyebrow: "GAME ZONE", title: "Choose your game", description: "3 games available", cards: [
      { title: "Spin the Wheel", description: "Spin the wheel and discover your reward.", action: "Spin Now" },
      { title: "Scratch & Reveal", description: "Scratch your card to reveal a surprise.", action: "Play Now" },
      { title: "Pick Your Reward", description: "Choose one card. One reward is waiting.", action: "Pick Now" },
    ],
  },
  how: {
    eyebrow: "SIMPLE & FAST", title: "How it works", steps: [
      { title: "Choose a game", description: "Select Spin, Scratch or Pick a Card for your campaign." },
      { title: "Build your campaign", description: "Sign in, customize your game and configure rewards." },
      { title: "Publish and share", description: "Review your campaign and share its customer URL." },
    ],
  },
  footer: { copyright: "© 2026 Mini Game Hub", termsLabel: "Terms & Conditions", privacyLabel: "Privacy" },
  theme: { primary: "#e31b23", accent: "#ff5b61", heroBackground: "#101828", pageBackground: "#f6f7f9" },
  seasonalThemes: [],
};

export function resolveActiveTheme(content: HomepageContent, now = new Date()): SeasonalTheme | null {
  return content.seasonalThemes
    .filter((theme) => theme.enabled && theme.startsAt && theme.endsAt && new Date(theme.startsAt) <= now && now <= new Date(theme.endsAt))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0] ?? null;
}

const colorPattern = /^#[0-9a-f]{6}$/i;
const cleanText = (value: unknown, fallback: string, limit = 240) => typeof value === "string" ? value.trim().slice(0, limit) : fallback;
const cleanColor = (value: unknown, fallback: string) => typeof value === "string" && colorPattern.test(value) ? value : fallback;

export function normalizeHomepageContent(input: unknown): HomepageContent {
  const value = input && typeof input === "object" ? input as Partial<HomepageContent> : {};
  const base = DEFAULT_HOMEPAGE_CONTENT;
  const list = Array.isArray(value.seasonalThemes) ? value.seasonalThemes.slice(0, 12) : [];
  return {
    header: {
      brand: cleanText(value.header?.brand, base.header.brand, 60),
      announcement: cleanText(value.header?.announcement, base.header.announcement),
      showAnnouncement: value.header?.showAnnouncement === true,
    },
    hero: {
      eyebrow: cleanText(value.hero?.eyebrow, base.hero.eyebrow, 80),
      title: cleanText(value.hero?.title, base.hero.title, 100),
      highlight: cleanText(value.hero?.highlight, base.hero.highlight, 60),
      description: cleanText(value.hero?.description, base.hero.description, 500),
      primaryCta: cleanText(value.hero?.primaryCta, base.hero.primaryCta, 50),
      secondaryCta: cleanText(value.hero?.secondaryCta, base.hero.secondaryCta, 50),
    },
    games: {
      eyebrow: cleanText(value.games?.eyebrow, base.games.eyebrow, 80),
      title: cleanText(value.games?.title, base.games.title, 100),
      description: cleanText(value.games?.description, base.games.description, 100),
      cards: base.games.cards.map((card, index) => ({
        title: cleanText(value.games?.cards?.[index]?.title, card.title, 100),
        description: cleanText(value.games?.cards?.[index]?.description, card.description, 240),
        action: cleanText(value.games?.cards?.[index]?.action, card.action, 50),
      })),
    },
    how: {
      eyebrow: cleanText(value.how?.eyebrow, base.how.eyebrow, 80),
      title: cleanText(value.how?.title, base.how.title, 100),
      steps: base.how.steps.map((step, index) => ({
        title: cleanText(value.how?.steps?.[index]?.title, step.title, 100),
        description: cleanText(value.how?.steps?.[index]?.description, step.description, 240),
      })),
    },
    footer: {
      copyright: cleanText(value.footer?.copyright, base.footer.copyright, 120),
      termsLabel: cleanText(value.footer?.termsLabel, base.footer.termsLabel, 60),
      privacyLabel: cleanText(value.footer?.privacyLabel, base.footer.privacyLabel, 60),
    },
    theme: {
      primary: cleanColor(value.theme?.primary, base.theme.primary),
      accent: cleanColor(value.theme?.accent, base.theme.accent),
      heroBackground: cleanColor(value.theme?.heroBackground, base.theme.heroBackground),
      pageBackground: cleanColor(value.theme?.pageBackground, base.theme.pageBackground),
    },
    seasonalThemes: list.map((raw, index) => {
      const theme = raw as Partial<SeasonalTheme>;
      const preset = ["christmas", "new-year", "ramadan", "custom"].includes(theme.preset ?? "") ? theme.preset! : "custom";
      return {
        id: cleanText(theme.id, `season-${index}`, 40), name: cleanText(theme.name, "Seasonal theme", 60), preset,
        startsAt: cleanText(theme.startsAt, "", 30), endsAt: cleanText(theme.endsAt, "", 30),
        announcement: cleanText(theme.announcement, "", 160),
        primary: cleanColor(theme.primary, base.theme.primary), accent: cleanColor(theme.accent, base.theme.accent),
        heroBackground: cleanColor(theme.heroBackground, base.theme.heroBackground), pageBackground: cleanColor(theme.pageBackground, base.theme.pageBackground),
        enabled: theme.enabled === true,
      };
    }),
  };
}
