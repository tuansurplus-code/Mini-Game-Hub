export const platformRoleLabels = { owner: "Super Admin", admin: "Admin", support: "Operator" } as const;
export type PlatformRole = keyof typeof platformRoleLabels;
export function isPlatformRole(value: unknown): value is PlatformRole {
  return value === "owner" || value === "admin" || value === "support";
}
