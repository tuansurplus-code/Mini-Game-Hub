import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/saas-admin", "/api/", "/auth/", "/reset-password", "/change-password", "/saas-password", "/saas-mfa"] } };
}
