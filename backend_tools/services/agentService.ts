// app/services/agentService.ts

type ConvertPayload = { tanAmount: number; rate: number };
type WithdrawPayload = { userId: string; amountAcset: number };
type BuyPayload = { acsetAmount: number };

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function convertTanToAcset({ tanAmount, rate }: ConvertPayload) {
  if (tanAmount <= 0) throw new Error("Montant TAN invalide");
  if (rate <= 0) throw new Error("Taux de conversion invalide");

  await delay(600);
  const acset = tanAmount * rate;

  return { acset, message: `✅ Converti ${tanAmount} TAN → ${acset} ACSET` };
}

export async function receiveUserWithdrawal({ userId, amountAcset }: WithdrawPayload) {
  if (!userId) throw new Error("Utilisateur manquant");
  if (amountAcset <= 0) throw new Error("Montant ACSET invalide");

  await delay(600);
  return { ok: true, message: `✅ Retrait validé pour ${userId} : ${amountAcset} ACSET` };
}

export async function buyAcsetFromAdmin({ acsetAmount }: BuyPayload) {
  if (acsetAmount <= 0) throw new Error("Montant ACSET invalide");

  await delay(600);
  return { ok: true, message: `✅ Achat confirmé : ${acsetAmount} ACSET auprès de RHAZN Admin` };
}
