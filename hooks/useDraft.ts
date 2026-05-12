// hooks/useDraft.ts — VERSION PRODUCTION SIMPLIFIÉE ✅✅✅

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDraft,
  EMPTY_DRAFT,
  hasDraft,
  loadDraft,
  saveDraft,
  SuspentzDraft,
} from "../lib/draftService";

import { supabase } from "../lib/supabase";

const AUTOSAVE_INTERVAL_MS = 8000;
const DEBOUNCE_SAVE_MS = 600;
const REQUEST_TIMEOUT = 30000;

type DraftStatus =
  | "idle"
  | "recovering"
  | "saved"
  | "saving"
  | "processing"
  | "ready"
  | "error";

export function useDraft() {
  const [draft, setDraft] = useState<SuspentzDraft>(EMPTY_DRAFT);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [hasRecovery, setHasRecovery] = useState(false);

  const draftRef = useRef(draft);
  const debounceRef = useRef<any>(null);
  const autosaveRef = useRef<any>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // ✅ RECOVERY
  useEffect(() => {
    (async () => {
      setStatus("recovering");
      const exists = await hasDraft();

      if (exists) {
        setHasRecovery(true);
        setStatus("idle");
      } else {
        setStatus("idle");
        startAutosave();
      }
    })();
  }, []);

  const startAutosave = () => {
    if (autosaveRef.current) return;

    autosaveRef.current = setInterval(async () => {
      if (!draftRef.current.videoUri) return;
      await saveDraft(draftRef.current);
      setStatus("saved");
    }, AUTOSAVE_INTERVAL_MS);
  };

  // ✅ NORMALIZE FILE URI (ANDROID SAFE)
  const normalizeUri = (uri: string) => {
    if (!uri) return uri;
    return uri.startsWith("file://") ? uri : `file://${uri}`;
  };

  // ✅ UPDATE DRAFT
  const updateDraft = useCallback((partial: Partial<SuspentzDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial };

      if (
        ("videoUri" in partial ||
          "selectedTrack" in partial ||
          "audioSegmentIndex" in partial) &&
        next.finalVideoUri
      ) {
        next.finalVideoUri = null;
      }

      draftRef.current = next;
      return next;
    });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setStatus("saving");
      await saveDraft(draftRef.current);
      setStatus("saved");
    }, DEBOUNCE_SAVE_MS);
  }, []);

  const saveNow = async () => {
    setStatus("saving");
    await saveDraft(draftRef.current);
    setStatus("saved");
  };

  // ✅ GENERATE VIDEO — VERSION SIMPLIFIÉE (GALLERY VIDEO DIRECTEMENT)
  // ✅ Architecture nouvelle:
  //   - Utilisateur sélectionne vidéo montée (CapCut + musique RHAZN déjà intégrée)
  //   - On upload directement sans manipuler audio
  //   - Plus de FFmpeg, plus de serveur de fusion
  const generateVideo = useCallback(async (): Promise<string | null> => {
    const d = draftRef.current;

    if (!d.videoUri) {
      console.warn("❌ Missing video URI");
      return null;
    }

    try {
      setStatus("processing");
      setProgress(0);

      console.log("✅ Video ready for preview and publish (from gallery)");
      setProgress(100);
      
      // ✅ La vidéo est déjà montée avec la musique dans CapCut
      // On la marque simplement comme prête
      updateDraft({ finalVideoUri: d.videoUri });
      setStatus("ready");

      return d.videoUri;

    } catch (e) {
      console.error("❌ VIDEO GENERATION ERROR:", e);
      setStatus("error");
      setProgress(0);
      return null;
    }
  }, [updateDraft]);

  // ✅ PUBLISH — Publication directe Supabase (RPC)
  const publish = useCallback(async (formData: any) => {
    const d = draftRef.current;

    if (!d.finalVideoUri) {
      console.warn("❌ No final video");
      return false;
    }

    try {
      setStatus("processing");
      setProgress(50);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;

      if (!uid) {
        console.error("❌ No user session");
        setStatus("error");
        return false;
      }

      // ✅ Call RPC to publish directly to Supabase
      const { data, error } = await supabase.rpc("publish_suspentz_final", {
        p_user_id: uid,
        p_video_uri: d.finalVideoUri,
        p_title: d.title || "Sans titre",
        p_theme: formData?.theme || "general",
        p_author: formData?.author || "",
        p_description: formData?.description || "",
      });

      if (error) {
        console.error("❌ RPC publish error:", error.message);
        setStatus("error");
        return false;
      }

      console.log("✅ Published successfully:", data);

      await clearDraft();
      setDraft(EMPTY_DRAFT);
      setStatus("ready");
      setProgress(100);

      return true;

    } catch (e) {
      console.error("❌ PUBLISH ERROR:", e);
      setStatus("error");
      return false;
    }
  }, []);

  const discardDraft = async () => {
    await clearDraft();
    setDraft(EMPTY_DRAFT);
    setStatus("idle");
  };

  const acceptRecovery = async () => {
    const saved = await loadDraft();
    if (!saved) return;

    setDraft(saved);
    setHasRecovery(false);
    setStatus(saved.finalVideoUri ? "ready" : "saved");
    startAutosave();
  };

  const declineRecovery = async () => {
    await clearDraft();
    setHasRecovery(false);
    setDraft(EMPTY_DRAFT);
    setStatus("idle");
    startAutosave();
  };

  const canPublish =
    !!draft.finalVideoUri && draft.title?.trim().length > 0;

  return {
    draft,
    status,
    progress,
    hasRecovery,
    canPublish,
    updateDraft,
    saveNow,
    generateVideo,
    publish,
    discardDraft,
    acceptRecovery,
    declineRecovery,
    isProcessing: status === "processing",
  };
}