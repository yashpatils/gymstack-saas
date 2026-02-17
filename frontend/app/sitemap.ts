import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

const routes = ["", "/features", "/pricing", "/contact", "/terms", "/privacy", "/cookies", "/status"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
