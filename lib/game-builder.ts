export const gameTypes = ["spin", "scratch", "pick-card"] as const;
export type BuilderGameType = (typeof gameTypes)[number];
export const gameLabels: Record<BuilderGameType, string> = {
  spin: "Spin & Win", scratch: "Scratch & Win", "pick-card": "Pick a Card",
};
export function builderGame(value: string | null | undefined): BuilderGameType | null {
  return gameTypes.includes(value as BuilderGameType) ? value as BuilderGameType : null;
}
export function withGame(path: string, game: BuilderGameType | null) {
  return game ? `${path}?game=${game}` : path;
}
