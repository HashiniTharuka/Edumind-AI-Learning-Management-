const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/,
];

export function getYouTubeId(url: string | undefined | null) {
  if (!url) return null;
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getVideoSource(url: string | undefined | null) {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) return { kind: "youtube" as const, embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}` };
  if (url) return { kind: "file" as const, src: url };
  return null;
}
