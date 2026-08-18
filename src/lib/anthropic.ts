import Anthropic from "@anthropic-ai/sdk";
import type { WebSearchResult } from "@/lib/serpapi";

const client = new Anthropic();

export type AlternativesVerdict = {
  findingsSummary: string;
  verdict: string;
};

// Section 5.3: "Check Alternatives" feeds SerpApi results through AI
// synthesis, a related but separate function from the content-research
// pipeline, not that pipeline repurposed as-is. Pure information, never
// switches anything automatically.
export async function synthesizeServiceAlternatives(
  serviceName: string,
  currentTier: string,
  searchResults: WebSearchResult[],
): Promise<AlternativesVerdict> {
  const context = searchResults
    .slice(0, 8)
    .map((r) => `- ${r.title}: ${r.snippet ?? ""} (${r.link})`)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: { effort: "low" },
    system:
      "You compare backend/SaaS service alternatives for a solo developer's personal dashboard. Be concrete and honest, flag low-confidence or thin search results rather than fabricating specifics.",
    messages: [
      {
        role: "user",
        content: `Current service: ${serviceName} (current tier: ${currentTier}).\n\nWeb search results on alternatives:\n${context || "(no results found)"}\n\nSummarize 2-3 real alternatives found in the results, their free tier and paid starting price if mentioned, in under 150 words. If the results don't actually name real alternatives, say so plainly instead of guessing. End your response with one final line formatted exactly as:\nVerdict: <one short sentence - worth switching, current pick is still solid, or worth testing first>`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const full = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

  const verdictMatch = full.match(/Verdict:\s*(.+)$/im);
  return {
    findingsSummary: full.replace(/\n?Verdict:.+$/im, "").trim(),
    verdict: verdictMatch?.[1]?.trim() ?? "Unable to determine a verdict from the search results.",
  };
}
