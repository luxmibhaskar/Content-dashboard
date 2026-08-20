import {
  SiYoutube,
  SiInstagram,
  SiTiktok,
  SiThreads,
  SiFacebook,
  SiX,
  SiPinterest,
  SiSnapchat,
  SiSubstack,
  SiPatreon,
  SiDiscord,
  SiTwitch,
  SiReddit,
  SiSpotify,
  SiApplepodcasts,
  SiMedium,
  SiBluesky,
  SiMastodon,
  SiKick,
  SiGumroad,
  SiKofi,
  SiBuymeacoffee,
  SiEtsy,
  SiShopify,
  SiSoundcloud,
  SiGithub,
} from "react-icons/si";
import type { IconType } from "react-icons";

// Streak & Goals redesign: "pick from a set" icon source for platform
// goals (real upload deferred, see 0013_platform_goals.sql). Simple
// Icons specifically, not this app's usual Lucide, per explicit
// direction, real brand logos are what "recognize which platform this
// goal is" actually needs, Lucide stays generic-icon-set everywhere
// else. Curated to platforms relevant to a content/creator dashboard,
// not the full multi-thousand-icon Simple Icons set. LinkedIn isn't
// included, Simple Icons doesn't ship it (removed at some point,
// verified against the installed react-icons version, not an
// oversight here).
export const PLATFORM_ICONS: { slug: string; label: string; Icon: IconType }[] = [
  { slug: "youtube", label: "YouTube", Icon: SiYoutube },
  { slug: "instagram", label: "Instagram", Icon: SiInstagram },
  { slug: "tiktok", label: "TikTok", Icon: SiTiktok },
  { slug: "threads", label: "Threads", Icon: SiThreads },
  { slug: "facebook", label: "Facebook", Icon: SiFacebook },
  { slug: "x", label: "X", Icon: SiX },
  { slug: "pinterest", label: "Pinterest", Icon: SiPinterest },
  { slug: "snapchat", label: "Snapchat", Icon: SiSnapchat },
  { slug: "substack", label: "Substack", Icon: SiSubstack },
  { slug: "medium", label: "Medium", Icon: SiMedium },
  { slug: "bluesky", label: "Bluesky", Icon: SiBluesky },
  { slug: "mastodon", label: "Mastodon", Icon: SiMastodon },
  { slug: "reddit", label: "Reddit", Icon: SiReddit },
  { slug: "discord", label: "Discord", Icon: SiDiscord },
  { slug: "twitch", label: "Twitch", Icon: SiTwitch },
  { slug: "kick", label: "Kick", Icon: SiKick },
  { slug: "spotify", label: "Spotify", Icon: SiSpotify },
  { slug: "applepodcasts", label: "Apple Podcasts", Icon: SiApplepodcasts },
  { slug: "soundcloud", label: "SoundCloud", Icon: SiSoundcloud },
  { slug: "patreon", label: "Patreon", Icon: SiPatreon },
  { slug: "gumroad", label: "Gumroad", Icon: SiGumroad },
  { slug: "kofi", label: "Ko-fi", Icon: SiKofi },
  { slug: "buymeacoffee", label: "Buy Me a Coffee", Icon: SiBuymeacoffee },
  { slug: "etsy", label: "Etsy", Icon: SiEtsy },
  { slug: "shopify", label: "Shopify", Icon: SiShopify },
  { slug: "github", label: "GitHub", Icon: SiGithub },
];

export type PlatformIconEntry = { slug: string; label: string; Icon: IconType };

// Returns the whole matched entry, not just its Icon, on purpose:
// react-hooks/static-components flags `const Icon = lookup(); <Icon/>`
// (a component reference pulled out of an arbitrary function call into
// its own binding), destructuring it straight off the result via
// `<match.Icon />` at the call site avoids that, same as how
// PLATFORM_ICONS.map(({ Icon }) => <Icon/>) below is already fine, it's
// a stable, statically-known member access either way.
export function findPlatformIcon(slug: string | null): PlatformIconEntry | undefined {
  return PLATFORM_ICONS.find((p) => p.slug === slug);
}
