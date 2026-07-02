import type { MetadataRoute } from "next";

// Public pages are crawlable; API and auth plumbing are not. Everything in
// the (app) group already redirects anonymous visitors to /signin.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
  };
}
