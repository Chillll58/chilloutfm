import {
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
  type RemoteTrack,
  type RemoteParticipant,
} from "livekit-client";

export type LiveToken = {
  ok: boolean;
  token?: string;
  url?: string;
  error?: string;
};

export async function getToken(opts: {
  room: string;
  identity: string;
  name: string;
  publish: boolean;
}): Promise<LiveToken> {
  try {
    const res = await fetch("/api/dating/live/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return (await res.json()) as LiveToken;
  } catch {
    return { ok: false, error: "network" };
  }
}

// Publisher: подключается и публикует камеру+микрофон в комнату
export async function startPublishing(
  url: string,
  token: string,
  videoEl: HTMLVideoElement
): Promise<Room> {
  const room = new Room({ adaptiveStream: true, dynacast: true });
  await room.connect(url, token);
  const tracks = await createLocalTracks({ audio: true, video: true });
  for (const t of tracks) {
    await room.localParticipant.publishTrack(t);
    if (t.kind === Track.Kind.Video) {
      t.attach(videoEl);
    }
  }
  return room;
}

// Viewer: подключается и показывает видео стримера
export async function startViewing(
  url: string,
  token: string,
  videoEl: HTMLVideoElement
): Promise<Room> {
  const room = new Room({ adaptiveStream: true });

  const attach = (track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      track.attach(videoEl);
    }
  };

  room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => attach(track));
  room.on(
    RoomEvent.ParticipantConnected,
    (_p: RemoteParticipant) => {
      /* noop */
    }
  );

  await room.connect(url, token);

  // attach already-published tracks
  room.remoteParticipants.forEach((p) => {
    p.trackPublications.forEach((pub) => {
      if (pub.track) attach(pub.track);
    });
  });

  return room;
}

export function leaveRoom(room: Room | null) {
  try {
    room?.disconnect();
  } catch {
    /* ignore */
  }
}
