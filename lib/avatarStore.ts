// lib/avatarStore.ts
// ✅ Store global pour invalider le cache avatar partout dans l'app

type Listener = () => void;

const versions: Record<string, number> = {};
const listeners = new Set<Listener>();

export const avatarStore = {
  // Obtenir la version d'un uid (timestamp)
  getVersion: (uid?: string | null): number => {
    if (!uid) return 0;
    return versions[uid] ?? 0;
  },

  // Invalider le cache d'un uid → tous les composants qui écoutent se re-renderent
  invalidate: (uid: string) => {
    versions[uid] = Date.now();
    listeners.forEach(l => l());
  },

  // S'abonner aux changements
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Ajouter ?v=TIMESTAMP à une URL pour briser le cache
  bust: (url: string | null | undefined, uid?: string | null): string | null => {
    if (!url) return null;
    const v = uid ? (versions[uid] ?? 0) : 0;
    if (!v) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${v}`;
  },
};