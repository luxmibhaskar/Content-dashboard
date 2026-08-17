import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The nightly backup route reads docs/builder-brief.md at runtime to
  // write it into Drive as SYSTEM_MANIFEST.md (Section 17.3), a plain
  // fs.readFileSync call isn't enough to guarantee Vercel's serverless
  // trace includes a file nothing imports, so it's listed explicitly.
  outputFileTracingIncludes: {
    "/api/cron/backup": ["./docs/builder-brief.md"],
  },
};

export default nextConfig;
