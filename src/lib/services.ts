// Reference table for the System & Services panel (Section 5.3).
// Static documentation (Phase 1) plus, for services with a real usage
// endpoint, live status and "Check Alternatives" (Phase 3, Section 5.3).
export type ServiceInfo = {
  id: string;
  service: string;
  powers: string;
  tier: string;
  estCost: string;
  swapAlternatives: string;
  hasLiveStatus: boolean;
};

export const SERVICES: ServiceInfo[] = [
  {
    id: "supabase",
    service: "Supabase",
    powers: "Database + login",
    tier: "Free",
    estCost: "$0 (watch storage over time)",
    swapAlternatives: "Neon, PlanetScale",
    hasLiveStatus: true,
  },
  {
    id: "vercel",
    service: "Vercel",
    powers: "Hosting",
    tier: "Free",
    estCost: "$0",
    swapAlternatives: "Netlify, Cloudflare Pages",
    hasLiveStatus: false,
  },
  {
    id: "github",
    service: "GitHub",
    powers: "Code storage",
    tier: "Free",
    estCost: "$0",
    swapAlternatives: "GitLab, Bitbucket",
    hasLiveStatus: false,
  },
  {
    id: "google-sheets-drive",
    service: "Google Sheets + Drive",
    powers: "Backup (two layers)",
    tier: "Free",
    estCost: "$0",
    swapAlternatives: "Any spreadsheet + cloud storage combo",
    hasLiveStatus: true,
  },
  {
    id: "youtube",
    service: "YouTube Data API",
    powers: "Research automation",
    tier: "Free (daily quota)",
    estCost: "$0",
    swapAlternatives: "None, no real substitute for YouTube-specific data",
    hasLiveStatus: false,
  },
  {
    id: "reddit",
    service: "Reddit API",
    powers: "Research automation",
    tier: "Free (approval required)",
    estCost: "$0",
    swapAlternatives:
      "SerpApi site:reddit.com search, the actual default path since official approval never came through",
    hasLiveStatus: false,
  },
  {
    id: "serpapi",
    service: "SERP API (e.g. SerpApi)",
    powers: "Google search behavior research",
    tier: "Free tier, then paid",
    estCost: "$0-25+/mo",
    swapAlternatives: "Any competing SERP API provider",
    hasLiveStatus: true,
  },
  {
    id: "anthropic",
    service: "AI provider (starts as Anthropic)",
    powers: "Research synthesis, ranked suggestions",
    tier: "Paid, usage-based",
    estCost: "Small, usage-based",
    swapAlternatives: "Gemini, GPT, any provider",
    hasLiveStatus: false,
  },
];
