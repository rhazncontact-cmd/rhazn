import { Alert } from "react-native";
import { supabase } from "../../lib/supabase";

export const getActionPrice = async (code: string) => {
  const { data, error } = await supabase
    .from("system_actions")
    .select("price_tan")
    .eq("code", code)
    .eq("is_active", true)
    .single();

  if (error || !data) throw new Error("Action indisponible");
  return data.price_tan;
};

export const getWalletBalance = async () => {
  const { data, error } = await supabase
    .from("wallets")
    .select("tan_balance")
    .single();

  if (error || !data) throw new Error("Wallet introuvable");
  return data.tan_balance;
};

export const confirmPaidAction = async (
  actionCode: string,
  label: string
) => {
  const price = await getActionPrice(actionCode);
  const balance = await getWalletBalance();

  if (balance < price) {
    Alert.alert(
      "Solde insuffisant",
      `Cette action coûte ${price} TAN.\n\nSolde actuel : ${balance} TAN.`
    );
    return false;
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      label,
      `Coût : ${price} TAN\n\nCette action est soumise à validation CADNA.`,
      [
        { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
        { text: "Continuer", onPress: () => resolve(true) },
      ]
    );
  });
};

export const payAction = async (actionCode: string) => {
  const { error } = await supabase.rpc("pay_before_action", {
    p_action_code: actionCode,
  });

  if (error) throw error;
};
