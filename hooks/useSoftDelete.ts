// hooks/useSoftDelete.ts
// ✅ Hook universel — remplace TOUS les .delete() de l'app
// Usage : const { softDelete } = useSoftDelete();
//         await softDelete(id, "PRODUCT" | "SUSPENTZ");

import * as Haptics from "expo-haptics";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";

export type SoftDeleteType = "PRODUCT" | "SUSPENTZ" | "PUBLICATION";

export function useSoftDelete() {

  const softDelete = async (
    contentId:   string,
    contentType: SoftDeleteType,
    title?:      string,
    options?: {
      confirm?:  boolean;
      onSuccess?: () => void;
      onError?:  (msg: string) => void;
    }
  ): Promise<boolean> => {

    const { confirm = true, onSuccess, onError } = options ?? {};

    const doDelete = async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("soft_delete_content", {
        p_content_id:   contentId,
        p_content_type: contentType,
      });

      if (error || !data?.success) {
        const msg = error?.message || data?.error || "Suppression impossible.";
        onError?.(msg);
        return false;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSuccess?.();
      return true;
    };

    if (!confirm) return doDelete();

    return new Promise((resolve) => {
      Alert.alert(
        "Mettre à la corbeille ?",
        `"${title ?? "Cet élément"}" sera déplacé dans la corbeille. Vous pourrez le restaurer dans 30 jours.`,
        [
          { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
          { text: "Mettre à la corbeille", style: "destructive", onPress: async () => {
            const result = await doDelete();
            resolve(result);
          }},
        ]
      );
    });
  };

  const supremeDelete = async (
    contentId:   string,
    contentType: SoftDeleteType,
    title?:      string,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        "⚡ Supreme — Supprimer",
        `"${title ?? "Cet élément"}" sera déplacé dans la corbeille.`,
        [
          { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
          { text: "Supprimer", style: "destructive", onPress: async () => {
            const { data } = await supabase.rpc("supreme_soft_delete", {
              p_content_id:   contentId,
              p_content_type: contentType,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            resolve(data?.success ?? false);
          }},
        ]
      );
    });
  };

  return { softDelete, supremeDelete };
}