import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/journal": ["./src/lib/journal/reference/journal.html", "./src/app/journal/journal.css"] },
};

export default nextConfig;
