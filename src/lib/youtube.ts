const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// GROUP J: live channel stats for the platform-goal auto-update. One
// quota unit per call. Accepts a bare channel id (UC...) or an @handle;
// anything else (a legacy /user/ name, a full URL) is rejected with a
// clear message rather than silently returning nothing.
export type YouTubeChannelStats = {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
};

export async function fetchYouTubeChannelStats(sourceRef: string): Promise<YouTubeChannelStats> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured.");
  }

  const ref = sourceRef.trim();
  if (!ref) {
    throw new Error("No YouTube channel ID or handle set for this platform.");
  }

  const url = new URL(`${YOUTUBE_API_BASE}/channels`);
  url.searchParams.set("part", "statistics");
  if (ref.startsWith("@")) {
    url.searchParams.set("forHandle", ref);
  } else if (/^UC[\w-]{20,}$/.test(ref)) {
    url.searchParams.set("id", ref);
  } else {
    throw new Error(`"${ref}" is not a channel ID (UC...) or an @handle.`);
  }
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`YouTube channel lookup failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    items?: { statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string } }[];
  };
  const stats = data.items?.[0]?.statistics;
  if (!stats) {
    throw new Error(`No YouTube channel found for "${ref}".`);
  }

  return {
    subscriberCount: Number(stats.subscriberCount ?? 0),
    viewCount: Number(stats.viewCount ?? 0),
    videoCount: Number(stats.videoCount ?? 0),
  };
}

export type YouTubeVideoSignal = {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount: number | null;
  publishedAt: string;
  url: string;
  description: string;
  topComments: string[];
  transcriptAvailable: boolean;
};

type YouTubeSearchItem = { id?: { videoId?: string } };
type YouTubeVideoItem = {
  id: string;
  snippet: { title: string; channelTitle: string; publishedAt: string; description?: string };
  statistics?: { viewCount?: string };
};
type YouTubeCommentItem = {
  snippet: { topLevelComment: { snippet: { textOriginal: string } } };
};

// Section 16: "top 10 videos, transcripts where available." In practice,
// captions.download requires OAuth consent from the video's own channel
// owner, an API-key-only app has no path to real transcripts for
// third-party videos. transcriptAvailable is always false here, title +
// description + top comments are the actual signal, not a rare
// fallback for when a transcript happens to be missing.
export async function searchYouTubeSignals(query: string): Promise<YouTubeVideoSignal[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured.");
  }

  const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "relevance");
  searchUrl.searchParams.set("maxResults", "10");
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    throw new Error(`YouTube search failed: ${searchRes.status} ${await searchRes.text()}`);
  }
  const searchData = (await searchRes.json()) as { items?: YouTubeSearchItem[] };

  const videoIds = (searchData.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((v): v is string => Boolean(v));
  if (videoIds.length === 0) return [];

  const videosUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
  videosUrl.searchParams.set("part", "snippet,statistics");
  videosUrl.searchParams.set("id", videoIds.join(","));
  videosUrl.searchParams.set("key", apiKey);

  const videosRes = await fetch(videosUrl.toString());
  if (!videosRes.ok) {
    throw new Error(`YouTube video lookup failed: ${videosRes.status} ${await videosRes.text()}`);
  }
  const videosData = (await videosRes.json()) as { items?: YouTubeVideoItem[] };

  const results: YouTubeVideoSignal[] = [];
  for (const item of videosData.items ?? []) {
    let topComments: string[] = [];
    try {
      const commentsUrl = new URL(`${YOUTUBE_API_BASE}/commentThreads`);
      commentsUrl.searchParams.set("part", "snippet");
      commentsUrl.searchParams.set("videoId", item.id);
      commentsUrl.searchParams.set("maxResults", "5");
      commentsUrl.searchParams.set("order", "relevance");
      commentsUrl.searchParams.set("key", apiKey);
      const commentsRes = await fetch(commentsUrl.toString());
      if (commentsRes.ok) {
        const commentsData = (await commentsRes.json()) as { items?: YouTubeCommentItem[] };
        topComments = (commentsData.items ?? []).map(
          (c) => c.snippet.topLevelComment.snippet.textOriginal,
        );
      }
      // Non-OK here usually just means comments are disabled on that
      // video, not a real error worth failing the whole pull over.
    } catch {
      // Comments are supplementary signal, never worth aborting for.
    }

    results.push({
      videoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      description: item.snippet.description ?? "",
      topComments,
      transcriptAvailable: false,
    });
  }

  return results;
}
