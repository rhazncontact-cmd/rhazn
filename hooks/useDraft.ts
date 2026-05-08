// hooks/useDraft.ts — VERSION FINALE PRODUCTION ✅✅✅

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

  // ✅ GENERATE VIDEO (ULTRA STABLE)
  const generateVideo = useCallback(async (): Promise<string | null> => {
    const d = draftRef.current;

    if (!d.videoUri || !d.selectedTrack) {
      console.warn("Missing video or audio");
      return null;
    }

    try {
      setStatus("processing");
      setProgress(10);

      const fileUri =
        FileSystem.cacheDirectory + `final_${Date.now()}.mp4`;

      const formData = new FormData();

      formData.append("video", {
        uri: normalizeUri(d.videoUri),
        name: "video.mp4",
        type: "video/mp4",
      } as any);

      formData.append("audio", {
        uri: normalizeUri(d.selectedTrack.file_url),
        name: "audio.mp3",
        type: "audio/mpeg",
      } as any);

      formData.append("start", String(d.audioStartSec || 0));
      formData.append("duration", String(d.durationSec || 0));

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

      const result = await downloadResumable.downloadAsync();

      clearTimeout(timeout);

      if (!result || !result.uri) {
        throw new Error("Download failed");
      }

      setProgress(100);
      updateDraft({ finalVideoUri: result.uri });
      setStatus("ready");

      return result.uri;
    } catch (e) {
      console.error("VIDEO GENERATION ERROR:", e);
      setStatus("error");
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
