// RHAZN — ECONOMY (TAN ONLY)

export const TAN = {
  // consommation
  CONSUME_COST: {
    SUSPENTZ: 2,
    AUDIO: 1,
    VIDEO: 15,
    PROFILE: 10,
    LYRICS: 4,
    IMAGES: 12,
    KOZESANS: 5,
  },

  // transfert
  TRANSFER_FEE_RATE: 0.02,
  TRANSFER_MIN: 1000,
  TRANSFER_MAX_DAY: 2_500_000,

  // retrait
  WITHDRAW: {
    MIN: 5000,
    MAX: 250_000,
    USER_FEE: 0.15,
    AGENT_SHARE: 0.10,
    SUPREME_SHARE: 0.05,
  },
};

export const WATCH_RULES = {
  FREE_SECONDS: 4,
  BILL_AT_SECOND: 5,
};
