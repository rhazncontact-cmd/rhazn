// lib/logoutStore.ts
// ✅ Store singleton — signale au _layout qu'un logout est volontaire
// Usage : logoutStore.trigger() → avant supabase.auth.signOut()

class LogoutStore {
  private _explicit = false;

  /** Appeler AVANT supabase.auth.signOut() */
  trigger() {
    this._explicit = true;
  }

  /** Lu par _layout.tsx dans le listener SIGNED_OUT */
  get isExplicit() {
    return this._explicit;
  }

  /** Reset après usage */
  reset() {
    this._explicit = false;
  }
}

export const logoutStore = new LogoutStore();