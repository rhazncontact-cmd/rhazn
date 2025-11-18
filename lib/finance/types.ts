export type WithdrawStatus =
  | "pending"
  | "auto_approved"
  | "auto_rejected"
  | "needs_review"
  | "approved"
  | "rejected"
  | "processing";

// =======================================
// Withdraw Request (Retraits TAN internes)
// =======================================
export interface WithdrawRequest {
  id: string;
  userId: string;
  edeId: string;          // ED impliqué dans le retrait interne
  amountTan: number;      // Montant TAN demandé
  feeTan: number;         // Frais internes TAN selon barème RHAZN (15%)
  acsetImpact?: number;   // Impact éventuel sur ACSET
  method: "Ajustement Interne" | "Compensation TAN" | "Redistribution" | "Interne"; 
  createdAt: string;
  status: WithdrawStatus;
  iaScore: number;        // Score IA interne (confiance)
  reason?: string;        // Raison IA ou administrative
}

// =======================================
// Mouvements internes ACSET / TAN
// =======================================
export type MovementType =
  | "TAN_TRANSFER"
  | "TAN_WITHDRAW"
  | "TAN_TO_ACSET"
  | "ACSET_CREDIT"
  | "ACSET_DEBIT"
  | "FEE"
  | "BONUS";

export interface AcsetMovement {
  id: string;
  date: string;
  type: MovementType;
  from?: string;
  to?: string;
  amount: number;
  currency: "TAN" | "ACSET";    // aucune monnaie externe
  note?: string;
  status: "ok" | "flagged" | "blocked";
}

// =======================================
// Transactions internes de RHAZN
// =======================================
export interface Txn {
  id: string;
  userId?: string;
  edeId?: string;

  // NOTE: Économie 100% interne
  type:
    | MovementType
    | "WITHDRAW_REQUEST"
    | "WITHDRAW_PAYOUT";

  amount: number;
  currency: "TAN" | "ACSET";   // ❌ HTG supprimé (interdit)

  createdAt: string;
  status: "ok" | "pending" | "failed";
  meta?: Record<string, any>;
}

// =======================================
// Système comptable interne (verrouillage)
// =======================================
export interface AccountingLock {
  id: string;
  subjectId: string;   // ex: id retrait TAN
  lockedBy: string;    // rôle ou utilisateur interne
  lockedAt: string;
  signatures: Array<{ by: string; at: string }>;
  status: "open" | "validated" | "rejected";
}

// =======================================
// Statistiques internes du système fermé
// =======================================
export interface FinanceStats {
  totalAcsetInCirculation: number;
  totalTanConverted: number;        // conversions internes TAN → ACSET
  totalWithdrawRequests: number;    // retraits TAN internes ED
  systemFeesAcset: number;          // frais internes (ACSET)
  variation: {
    acset: number;
    tan: number;
    withdraws: number;
    fees: number;
  };
}
