let _verified = false;
let _lastVerifiedAt: number | null = null;

// ⏱ durée de validité du PIN (ex: 5 minutes)
const SESSION_DURATION = 5 * 60 * 1000;

export const espacePinStore = {
  isVerified: () => {
    // ❌ jamais validé
    if (!_verified) return false;

    // 🔒 sécurité : expiration automatique
    if (_lastVerifiedAt && Date.now() - _lastVerifiedAt > SESSION_DURATION) {
      _verified = false;
      _lastVerifiedAt = null;
      return false;
    }

    return true;
  },

  verify: () => {
    _verified = true;
    _lastVerifiedAt = Date.now();
  },

  reset: () => {
    _verified = false;
    _lastVerifiedAt = null;
  },
};