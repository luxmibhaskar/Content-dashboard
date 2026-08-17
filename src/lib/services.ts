// Static reference table for the System & Services panel (Section 5.3).
// Phase 1 scope only: plain documentation surfaced as UI, no live usage
// numbers and no "Check Alternatives" action, both Phase 3.
export type ServiceInfo = {
  service: string;
  powers: string;
  tier: string;
  estCost: string;
  swapAlternatives: string;
};

export const SERVICES: ServiceInfo[] = [
  {
    service: "Supabase",
    powers: "Database + login",
    tier: "Free",
    estCost: "$0 (watch storage over time)",
    swapAlternatives: "Neon, PlanetScale",
  },
  {
    service: "Vercel",
    powers: "Hosting",
    tier: "Free",
    estCost: "$0",
    swapAlternatives: "Netlify, Cloudflare Pages",
  },
  {
    service: "GitHub",
    powers: "Code storage",
    tier: "Free",
    estCost: "$0",
    swapAlternatives: "GitLab, Bitbucket",
  },
  {
    service: "Google Sheets + Drive",
    powers: "Backup (two layers)",
    tier: "Free",
    estCost: "$0",
    swapAlternatives: "Any spreadsheet + cloud storage combo",
  },
  {
    service: "YouTube Data API",
    powers: "Research automation",
    tier: "Free (daily quota)",
    estCost: "$0",
    swapAlternatives: "None, no real substitute for YouTube-specific data",
  },
  {
    service: "Reddit API",
    powers: "Research automation",
    tier: "Free (approval required)",
    estCost: "$0",
    swapAlternatives:
      "SerpApi site:reddit.com search, the actual default path since official approval never came through",
  },
  {
    service: "SERP API (e.g. SerpApi)",
    powers: "Google search behavior research",
    tier: "Free tier, then paid",
    estCost: "$0-25+/mo",
    swapAlternatives: "Any competing SERP API provider",
  },
  {
    service: "AI provider (starts as Anthropic)",
    powers: "Research synthesis, ranked suggestions",
    tier: "Paid, usage-based",
    estCost: "Small, usage-based",
    swapAlternatives: "Gemini, GPT, any provider",
  },
];
