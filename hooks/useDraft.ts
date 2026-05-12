// hooks/useDraft.ts — VERSION PRODUCTION UPDATED ✅✅✅

import * as FileSystem from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDraft,
  EMPTY_DRAFT,
  hasDraft,
  loadDraft,
  saveDraft,
  SuspentzDraft,
} from "../lib/draftService";

import { API_URL } from "../config/api";
import { stripAudio } from "../lib/ffmpeg/stripAudio";

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

  // ✅ GENERATE VIDEO (ULTRA STABLE) - VERSION MISE À JOUR
  const generateVideo = useCallback(async (): Promise<string | null> => {
    const d = draftRef.current;

    if (!d.videoUri || !d.selectedTrack) {
      console.warn("Missing video or audio");
      return null;
    }

    try {
      setStatus("processing");
      setProgress(10);

      // 🔇 ÉTAPE 1: SUPPRIMER LE SON ORIGINAL
      console.log("🔇 Starting to strip audio from video...");
      const mutedVideoUri = await stripAudio(d.videoUri, (percent) => {
        console.log(`🔇 Stripping progress: ${percent}%`);
        setProgress(Math.min(40, 10 + percent * 0.3));
      });

      if (!mutedVideoUri) {
        console.error("❌ Failed to strip audio");
        setStatus("error");
        return null;
      }

      console.log("✅ Audio stripped successfully");
      setProgress(45);

      // 📤 ÉTAPE 2: ENVOYER VIDÉO MUETTE + SON RHAZN AU SERVEUR
      const fileUri =
        FileSystem.cacheDirectory + `final_${Date.now()}.mp4`;

      const formData = new FormData();

      // ✅ Envoyer la vidéo MUETTE (sans son original)
      formData.append("video", {
        uri: normalizeUri(mutedVideoUri),
        name: "muted.mp4",
        type: "video/mp4",
      } as any);

      // ✅ Envoyer le son RHAZN obligatoire
      formData.append("audio", {
        uri: normalizeUri(d.selectedTrack.file_url),
        name: "rhazn.mp3",
        type: "audio/mpeg",
      } as any);

      formData.append("start", String(d.audioStartSec || 0));
      formData.append("duration", String(d.durationSec || 0));

      console.log("📤 Sending to server /render...");
      setProgress(50);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const downloadResumable = FileSystem.createDownloadResumable(
        `${API_URL}/render`,
        fileUri,
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setProgress(75);
      const result = await downloadResumable.downloadAsync();

      clearTimeout(timeout);

      if (!result || !result.uri) {
        console.error("❌ Download failed from /render");
        throw new Error("Download failed");
      }

      console.log("✅ Video received from server");
      setProgress(95);

      // ✅ ÉTAPE 3: ENREGISTRER LA VIDÉO FINALE
      updateDraft({ finalVideoUri: result.uri });
      setProgress(100);
      setStatus("ready");

      console.log("✅ Final video ready for preview and publish");
      return result.uri;

    } catch (e) {
      console.error("❌ VIDEO GENERATION ERROR:", e);
      setStatus("error");
      setProgress(0);
      return null;
    }
  }, [updateDraft]);

  // ✅ PUBLISH
  const publish = useCallback(async () => {
    const d = draftRef.current;

    if (!d.finalVideoUri) {
      console.warn("No final video");
      return false;
    }

    try {
      setStatus("processing");

      const formData = new FormData();

      formData.append("video", {
        uri: normalizeUri(d.finalVideoUri),
        name: "final.mp4",
        type: "video/mp4",
      } as any);

      formData.append("title", d.title || "");
      formData.append("audioId", d.selectedTrack?.id || "");
      formData.append("start", String(d.audioStartSec || 0));
      formData.append("end", String(d.audioEndSec || 0));

      const controller = new AbortController();
      setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const res = await fetch(`${API_URL}/posts`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Publish failed");

      await clearDraft();
      setDraft(EMPTY_DRAFT);
      setStatus("ready");
      setProgress(0);

      return true;
    } catch (e) {
      console.error("PUBLISH ERROR:", e);
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