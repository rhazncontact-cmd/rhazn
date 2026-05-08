// lib/adminPinStore.ts
// ✅ PIN Admin — session mémoire (reset si app backgroundée ou autre onglet footer)

let _verified = false;

const adminPinStore = {
  verify:     () => { _verified = true; },
  reset:      () => { _verified = false; },
  isVerified: () => _verified,
};

export default adminPinStore;