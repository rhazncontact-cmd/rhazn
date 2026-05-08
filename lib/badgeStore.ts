// lib/badgeStore.ts
// ✅ Store singleton partagé — badge notifications
// user-notifications.tsx lit et écrit ici
// RhaznFooter.tsx lit ici pour afficher le badge

type Listener = (count: number) => void;

class BadgeStore {
  private _count = 0;
  private _listeners: Set<Listener> = new Set();

  get count() { return this._count; }

  set(n: number) {
    this._count = Math.max(0, n);
    this._listeners.forEach(fn => fn(this._count));
  }

  decrement() {
    this.set(this._count - 1);
  }

  reset() {
    this.set(0);
  }

  subscribe(fn: Listener) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

export const badgeStore = new BadgeStore();