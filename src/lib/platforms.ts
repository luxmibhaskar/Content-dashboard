// builder-brief.md Section 16: platforms with no auto-syncing API, so
// their follower/subscriber counts stay manual entry. YouTube is
// deliberately excluded, its stats already pull live elsewhere in the
// app (Section 3's YouTube Data API integration), it doesn't need a
// manual count here too.
export const PLATFORMS = ["Instagram", "TikTok", "Threads", "Facebook"] as const;
export type Platform = (typeof PLATFORMS)[number];
