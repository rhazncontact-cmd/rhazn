import { supabase } from "@/lib/supabase";

export function useSoftDelete() {
  const supremeDelete = async (
    contentId: string,
    contentType: "PRODUCT" | "SUSPENTZ",
    contentTitle?: string | null
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc(
        "rz_supreme_delete_product",
        { p_content_id: contentId }
      );

      if (error) {
        console.error("❌ Supreme delete error:", error.message);
        return false;
      }

      if (data?.success === false) {
        console.error("❌ Supreme delete failed:", data.error);
        return false;
      }

      console.log(`✅ ${contentTitle || contentId} supprimé par Supreme`, data);
      return true;
    } catch (err) {
      console.error("❌ Supreme delete exception:", err);
      return false;
    }
  };

  const ownerDelete = async (
    contentId: string,
    contentType: "PRODUCT" | "SUSPENTZ" | "PUBLICATION"
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("soft_delete_content", {
        p_content_id: contentId,
        p_content_type: contentType,
      });

      if (error) {
        console.error("❌ Owner delete error:", error.message);
        return false;
      }

      if (data?.success === false) {
        console.error("❌ Owner delete failed:", data.error);
        return false;
      }

      console.log(`✅ ${contentId} supprimé par propriétaire`, data);
      return true;
    } catch (err) {
      console.error("❌ Owner delete exception:", err);
      return false;
    }
  };

  return { supremeDelete, ownerDelete };
}