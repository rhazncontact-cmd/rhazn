import { AccountingLock, AcsetMovement, FinanceStats, Txn, WithdrawRequest } from "./types";

// ====== Barème & règles RHAZN (écosystème fermé) ======
const FEE_RATE_TAN = 0.15;       // 15% frais TAN interne (10% RZ-Admin + 5% ED)
const IA_AUTO_APPROVE = 0.88;    // auto-approve si score >= 0.88
const IA_AUTO_REJECT  = 0.35;    // auto-reject si score < 0.35

// ====== MOCK DB en mémoire ======
let withdraws: WithdrawRequest[] = [
  {
    id: "w_1001",
    userId: "U_001",
    edeId: "EDE_10",
    amountTan: 1200,
    feeTan: Math.round(1200 * FEE_RATE_TAN),
    acsetImpact: 0,
    method: "Ajustement Interne ED",
    createdAt: new Date().toISOString(),
    status: "pending",
    iaScore: 0.91
  },
  {
    id: "w_1002",
    userId: "U_002",
    edeId: "EDE_11",
    amountTan: 380,
    feeTan: Math.round(380 * FEE_RATE_TAN),
    acsetImpact: 0,
    method: "Compensation TAN",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    status: "pending",
    iaScore: 0.52
  },
  {
    id: "w_1003",
    userId: "U_003",
    edeId: "EDE_11",
    amountTan: 9500,
    feeTan: Math.round(9500 * FEE_RATE_TAN),
    acsetImpact: 0,
    method: "Redistribution interne",
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    status: "pending",
    iaScore: 0.21
  }
];

let movements: AcsetMovement[] = [
  { id:"m1", date: new Date().toISOString(), type:"TAN_TRANSFER", from:"U_001", to:"U_004", amount: 200, currency:"TAN", note:"Partage TAN interne", status:"ok" },
  { id:"m2", date: new Date().toISOString(), type:"TAN_WITHDRAW", from:"U_002", to:"EDE_11", amount: 380, currency:"TAN", note:"Retrait TAN interne ED", status:"ok" },
  { id:"m3", date: new Date().toISOString(), type:"FEE", to:"RHAZN", amount: 8, currency:"TAN", note:"Frais internes retrait TAN", status:"ok" },
  { id:"m4", date: new Date().toISOString(), type:"ACSET_CREDIT", from:"RHAZN", to:"U_010", amount: 50, currency:"ACSET", note:"Bonus moral interne", status:"ok" },
];

let txns: Txn[] = [
  { id:"t1", type:"WITHDRAW_REQUEST", amount:1200, currency:"TAN", createdAt:new Date().toISOString(), status:"pending", userId:"U_001", edeId:"EDE_10" },
  { id:"t2", type:"TAN_TRANSFER", amount:200, currency:"TAN", createdAt:new Date().toISOString(), status:"ok", userId:"U_001" },
  { id:"t3", type:"WITHDRAW_PAYOUT", amount:380, currency:"TAN", createdAt:new Date().toISOString(), status:"ok", userId:"U_002", edeId:"EDE_11" },
];

let locks: AccountingLock[] = [];

let stats: FinanceStats = {
  totalAcsetInCirculation: 2_300_000,
  totalTanConverted: 45_000_000,
  totalWithdrawRequests: 12_500,
  systemFeesAcset: 85_000,
  variation: { acset: 0.12, tan: 0.08, withdraws: -0.03, fees: 0.15 }
};

// ====== IA Finance (décide statut automatique) ======
function aiClassifyWithdraw(w: WithdrawRequest): WithdrawRequest {
  if (w.iaScore >= IA_AUTO_APPROVE) {
    return { ...w, status: "auto_approved" };
  }
  if (w.iaScore < IA_AUTO_REJECT) {
    return { ...w, status: "auto_rejected", reason:"Score IA trop bas" };
  }
  return { ...w, status: "needs_review", reason:"Cas gris – validation humaine requise" };
}

// ====== API simulée ======
export const financeApi = {
  
  // ============= RETRAITS TAN INTERNES (ED seulement) =============
  listWithdraws: async (): Promise<WithdrawRequest[]> => {
    withdraws = withdraws.map(w =>
      w.status === "pending" ? aiClassifyWithdraw(w) : w
    );
    return new Promise(res => setTimeout(() => res([...withdraws]), 300));
  },

  approveWithdraw: async (id: string, by: string) => {
    withdraws = withdraws.map(w =>
      w.id === id ? ({ ...w, status:"approved", reason: undefined }) : w
    );

    txns.push({
      id: `t_${Date.now()}`,
      type: "WITHDRAW_PAYOUT", // interne TAN, pas d'argent réel
      amount: getById(id)?.amountTan ?? 0,
      currency: "TAN",
      createdAt: new Date().toISOString(),
      status: "ok"
    });

    locks.push({
      id: `lock_${id}`,
      subjectId: id,
      lockedBy: by,
      lockedAt: new Date().toISOString(),
      signatures: [{ by, at: new Date().toISOString() }],
      status: "validated"
    });

    return true;
  },

  rejectWithdraw: async (id: string, reason="Non conforme") => {
    withdraws = withdraws.map(w =>
      w.id === id ? ({ ...w, status:"rejected", reason }) : w
    );
    return true;
  },

  // ============= Mouvements internes TAN =============
  listMovements: async (): Promise<AcsetMovement[]> =>
    new Promise(res => setTimeout(() => res([...movements]), 250)),

  // ============= Historique =============
  listTransactions: async (): Promise<Txn[]> =>
    new Promise(res =>
      setTimeout(
        () => res([...txns].sort((a,b)=> (a.createdAt < b.createdAt ? 1 : -1))),
        250
      )
    ),

  // ============= Comptabilité interne =============
  getLocks: async (): Promise<AccountingLock[]> =>
    new Promise(res => setTimeout(() => res([...locks]), 200)),

  signLock: async (id: string, by: string) => {
    locks = locks.map(l =>
      l.id === id
        ? ({ ...l, signatures: [...l.signatures, { by, at: new Date().toISOString() }], status:"validated" })
        : l
    );
    return true;
  },

  // ============= Statistiques =============
  getStats: async (): Promise<FinanceStats> =>
    new Promise(res => setTimeout(() => res({ ...stats }), 200)),
};

function getById(id: string) {
  return withdraws.find(w => w.id === id);
}
