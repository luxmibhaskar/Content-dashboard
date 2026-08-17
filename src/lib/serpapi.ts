const SERPAPI_BASE = "https://serpapi.com/search";

async function serpApiRequest<T>(params: Record<string, string>): Promise<T> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_KEY is not configured.");
  }

  const url = new URL(SERPAPI_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`SerpApi request failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export type GoogleSearchSignal = {
  autocomplete: string[];
  peopleAlsoAsk: { question: string; snippet: string | null; link: string | null }[];
  relatedSearches: string[];
};

type AutocompleteResponse = { suggestions?: { value?: string }[] };
type GoogleSearchResponse = {
  related_questions?: { question?: string; snippet?: string; link?: string }[];
  related_searches?: { query?: string }[];
};

// Section 16: "Google search behavior, full autocomplete list, full
// People Also Ask list, related searches." Two separate SerpApi engines
// cover this, autocomplete has no organic-results equivalent.
export async function searchGoogleSignals(query: string): Promise<GoogleSearchSignal> {
  const [autocompleteData, googleData] = await Promise.all([
    serpApiRequest<AutocompleteResponse>({ engine: "google_autocomplete", q: query }),
    serpApiRequest<GoogleSearchResponse>({ engine: "google", q: query }),
  ]);

  const autocomplete = (autocompleteData.suggestions ?? [])
    .map((s) => s.value)
    .filter((v): v is string => Boolean(v));

  const peopleAlsoAsk = (googleData.related_questions ?? [])
    .filter((q) => q.question)
    .map((q) => ({
      question: q.question as string,
      snippet: q.snippet ?? null,
      link: q.link ?? null,
    }));

  const relatedSearches = (googleData.related_searches ?? [])
    .map((r) => r.query)
    .filter((v): v is string => Boolean(v));

  return { autocomplete, peopleAlsoAsk, relatedSearches };
}

export type WebSearchResult = { title: string; link: string; snippet: string | null };

type OrganicSearchResponse = {
  organic_results?: { title?: string; link?: string; snippet?: string }[];
};

async function searchSite(query: string, site: string): Promise<WebSearchResult[]> {
  const data = await serpApiRequest<OrganicSearchResponse>({
    engine: "google",
    q: `site:${site} ${query}`,
  });
  return (data.organic_results ?? [])
    .filter((r) => r.title && r.link)
    .map((r) => ({
      title: r.title as string,
      link: r.link as string,
      snippet: r.snippet ?? null,
    }));
}

// Reddit's official API access was not approved after two attempts (see
// docs/builder-brief.md Section 16), so this runs through the same
// general-web-search mechanism the brief already documents for Quora,
// a site:reddit.com query rather than a dedicated Reddit integration.
export async function searchRedditSignals(query: string): Promise<WebSearchResult[]> {
  return searchSite(query, "reddit.com");
}

// Section 16: "no official public API exists, so this runs through
// general web search results picking up Quora pages, the same
// mechanism as People Also Ask."
export async function searchQuoraSignals(query: string): Promise<WebSearchResult[]> {
  return searchSite(query, "quora.com");
}
