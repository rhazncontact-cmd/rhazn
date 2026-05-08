// hooks/useContentDuplicateCheck.ts
// ✅ Détection de doublons avant upload
// Couche 1 : SHA-256 hash exact du fichier
// Couche 2 : Empreinte métadonnées (taille + durée + résolution)
// Couche 3 : Similarité titre (pg_trgm via Supabase)

import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import { useState } from "react";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type DuplicateCheckResult = {
  is_duplicate:   boolean;
  reason:         "EXACT_HASH" | "METADATA_FINGERPRINT" | "TITLE_SIMILARITY" | null;
  reason_label:   string | null;
  existing_id:    string | null;
  existing_title: string | null;
  similarity:     number;
};

export type ContentMetadata = {
  title:           string;
  fileUri:         string;
  fileSizeBytes?:  number;
  durationSeconds?: number;
  contentType:     "SUSPENTZ" | "PRODUCT";
};

// ─────────────────────────────────────────────────────────────
// HASH UTILS
// ─────────────────────────────────────────────────────────────

/**
 * Calcule le SHA-256 d'un fichier en lisant par chunks
 * Compatible avec les gros fichiers vidéo (>100MB)
 */
async function computeFileHash(fileUri: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) return null;

    const fileSize = (info as any).size ?? 0;

    if (fileSize === 0) return null;

    // Pour les petits fichiers (<10MB) : hash complet
    if (fileSize < 10 * 1024 * 1024) {
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content
      );
    }

    // Pour les gros fichiers : hash par échantillonnage
    // - Premiers 512KB
    // - Milieu 512KB
    // - Derniers 512KB
    // Résultat = hash(concat des 3 échantillons)
    const CHUNK = 512 * 1024; // 512KB
    const chunks: string[] = [];

    // Début
    const startChunk = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: Math.min(CHUNK, fileSize),
    });
    chunks.push(startChunk.slice(0, 200)); // 200 chars suffisent

    // Milieu
    if (fileSize > CHUNK * 2) {
      const midPos = Math.floor(fileSize / 2);
      const midChunk = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        position: midPos,
        length: Math.min(CHUNK, fileSize - midPos),
      });
      chunks.push(midChunk.slice(0, 200));
    }

    // Fin
    if (fileSize > CHUNK) {
      const endPos = Math.max(0, fileSize - CHUNK);
      const endChunk = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        position: endPos,
        length: Math.min(CHUNK, fileSize - endPos),
      });
      chunks.push(endChunk.slice(0, 200));
    }

    // Hash de l'assemblage + taille (fingerprint robuste)
    const composite = `${chunks.join("|")}|SIZE:${fileSize}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      composite
    );
  } catch (e) {
    console.warn("⚠️ computeFileHash error:", e);
    return null;
  }
}

/**
 * Génère l'empreinte métadonnées
 * Format: SIZE:{bytes}|DUR:{seconds}|OWNER:{uid}
 */
function buildMetadataFingerprint(
  fileSizeBytes: number,
  durationSeconds?: number,
  ownerUid?: string
): string {
  const parts = [`SIZE:${fileSizeBytes}`];
  if (durationSeconds) parts.push(`DUR:${Math.round(durationSeconds)}`);
  if (ownerUid) parts.push(`OWNER:${ownerUid}`);
  return parts.join("|");
}

// ─────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────
export function useContentDuplicateCheck() {
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const checkDuplicate = async (
    meta: ContentMetadata
  ): Promise<DuplicateCheckResult> => {
    setChecking(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const ownerUid = session?.user?.id ?? undefined;

      // ── Couche 1 : Calcul du hash ──────────────────────────
      setProgress("Calcul de l'empreinte du fichier…");
      const contentHash = await computeFileHash(meta.fileUri);

      // ── Couche 2 : Empreinte métadonnées ──────────────────
      const fileInfo = await FileSystem.getInfoAsync(meta.fileUri);
      const fileSizeBytes = (fileInfo as any).size ?? meta.fileSizeBytes ?? 0;
      const metadataFingerprint = buildMetadataFingerprint(
        fileSizeBytes,
        meta.durationSeconds,
        ownerUid
      );

      // ── Appel RPC Supabase ─────────────────────────────────
      setProgress("Vérification des doublons…");
      const { data, error } = await supabase.rpc("check_content_duplicate", {
        p_content_hash:          contentHash,
        p_metadata_fingerprint:  metadataFingerprint,
        p_title:                 meta.title,
        p_content_type:          meta.contentType,
        p_owner_uid:             ownerUid ?? null,
        p_similarity_threshold:  0.75,
      });

      if (error) {
        console.warn("⚠️ check_content_duplicate error:", error.message);
        // En cas d'erreur, on laisse passer (fail open)
        return { is_duplicate: false, reason: null, reason_label: null, existing_id: null, existing_title: null, similarity: 0 };
      }

      const result = data as DuplicateCheckResult;

      // Logger si doublon détecté
      if (result.is_duplicate && ownerUid) {
        await supabase.rpc("log_duplicate_attempt", {
          p_user_id:    ownerUid,
          p_type:       meta.contentType,
          p_title:      meta.title,
          p_reason:     result.reason,
          p_existing:   result.existing_id,
          p_similarity: result.similarity,
        }).catch(() => {}); // fire & forget
      }

      return result;

    } catch (e) {
      console.warn("⚠️ checkDuplicate error:", e);
      return { is_duplicate: false, reason: null, reason_label: null, existing_id: null, existing_title: null, similarity: 0 };
    } finally {
      setChecking(false);
      setProgress("");
    }
  };

  /**
   * À appeler APRÈS un upload réussi pour enregistrer l'empreinte
   */
  const registerContentHash = async (
    contentId: string,
    meta: ContentMetadata
  ): Promise<void> => {
    try {
      const contentHash = await computeFileHash(meta.fileUri);
      const fileInfo = await FileSystem.getInfoAsync(meta.fileUri);
      const fileSizeBytes = (fileInfo as any).size ?? meta.fileSizeBytes ?? 0;

      const { data: { session } } = await supabase.auth.getSession();
      const ownerUid = session?.user?.id ?? undefined;

      const metadataFingerprint = buildMetadataFingerprint(
        fileSizeBytes, meta.durationSeconds, ownerUid
      );

      await supabase.rpc("register_content_hash", {
        p_content_id:           contentId,
        p_content_hash:         contentHash,
        p_metadata_fingerprint: metadataFingerprint,
        p_file_size_bytes:      fileSizeBytes,
        p_duration_seconds:     meta.durationSeconds ?? null,
        p_content_type:         meta.contentType,
      });
    } catch (e) {
      console.warn("⚠️ registerContentHash error:", e);
    }
  };

  return { checkDuplicate, registerContentHash, checking, progress };
}