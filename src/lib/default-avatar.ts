import a1 from "@/assets/avatars/avatar-1.png.asset.json";
import a2 from "@/assets/avatars/avatar-2.png.asset.json";
import a3 from "@/assets/avatars/avatar-3.png.asset.json";
import a4 from "@/assets/avatars/avatar-4.png.asset.json";
import a5 from "@/assets/avatars/avatar-5.png.asset.json";
import a6 from "@/assets/avatars/avatar-6.png.asset.json";

const AVATARS = [a1.url, a2.url, a3.url, a4.url, a5.url, a6.url];

/** Deterministic default avatar per member, so each profile keeps the same look. */
export const getDefaultAvatar = (seed?: string | null): string => {
  const key = seed || "";
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return AVATARS[hash % AVATARS.length];
};

/** Returns the member avatar, falling back to a stylized default. */
export const avatarSrc = (url?: string | null, seed?: string | null): string =>
  url || getDefaultAvatar(seed);
