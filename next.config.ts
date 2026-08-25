import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The nightly backup route reads docs/builder-brief.md at runtime to
  // write it into Drive as SYSTEM_MANIFEST.md (Section 17.3), a plain
  // fs.readFileSync call isn't enough to guarantee Vercel's serverless
  // trace includes a file nothing imports, so it's listed explicitly.
  //
  // Only set during `next build`: output file tracing is a build-time-only
  // concern (it produces the serverless deployment trace, next dev never
  // needs it), and in this Next.js 16.3.1 + Turbopack combination, having
  // this option set at all makes `next dev` spin up a background
  // output-file-tracing worker that crashes on every dynamic route render
  // ("Jest worker encountered N child process exceptions, exceeding retry
  // limit", eventually taking the whole dev server down). Confirmed by
  // reproducing the crash with a bare page reload (no app code involved)
  // and watching it disappear once this was scoped to production builds.
  ...(process.env.NODE_ENV === "production" && {
    outputFileTracingIncludes: {
      "/api/cron/backup": ["./docs/builder-brief.md"],
    },
  }),
};

export default nextConfig;
