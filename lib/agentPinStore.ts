// lib/agentPinStore.ts
// ✅ PIN Agent — session mémoire (reset si app backgroundée ou autre onglet footer)

let _verified = false;

const agentPinStore = {
  verify: ()  => { _verified = true; },
  reset:  ()  => { _verified = false; },
  isVerified: () => _verified,
};

export default agentPinStore;