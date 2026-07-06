// Deterministic pseudo-popularity so tracks differ even before any votes.
// Combines a stable hash of the track (baseline "plays"), real likes,
// and a boost when the artist is a favorite.

export function baselinePlays(songid: string): number {
  let hash = 0;
  for (let i = 0; i < songid.length; i++) {
    hash = (hash << 5) - hash + songid.charCodeAt(i);
    hash |= 0;
  }
  // 20..100 range, stable per track
  return 20 + (Math.abs(hash) % 81);
}

export function popularityScore(opts: {
  songid: string;
  likes: number;
  isFavoriteArtist: boolean;
  isLive?: boolean;
}): number {
  const base = baselinePlays(opts.songid); // 20..100
  const likeBoost = opts.likes * 25; // each like is significant
  const favBoost = opts.isFavoriteArtist ? 60 : 0;
  const liveBoost = opts.isLive ? 25 : 0;
  return base + likeBoost + favBoost + liveBoost;
}
