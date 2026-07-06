export type Track = {
  time: string;
  song: string;
  artist: string;
  title: string;
  img: string;
  songid: string;
};

export type NowPlaying = {
  online: boolean;
  station: string;
  genre: string;
  kbps: string;
  listeners: number;
  favorites: number;
  djname: string;
  logo: string;
  current: {
    artist: string;
    title: string;
    song: string;
    img: string;
  };
  next: Track[];
  history: Track[];
  streamUrl: string;
  updatedAt: number;
};
