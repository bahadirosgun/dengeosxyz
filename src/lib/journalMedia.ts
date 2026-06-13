import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "./imageCompress";
import { getCache } from "./appData";

export type JournalTag = "meal" | "movement" | "weight" | "general";

export const TAG_LABEL: Record<JournalTag, string> = {
  meal: "🍽️ Yemek",
  movement: "🏃 Hareket",
  weight: "Ölçüm",
  general: "🌿 Genel",
};

export interface JournalMediaItem {
  id: string;
  storagePath: string;
  caption: string | null;
  tag: JournalTag;
  takenAt: string;
  width: number | null;
  height: number | null;
}

const BUCKET = "journal-media";

export async function uploadJournalMedia(input: {
  file: File;
  caption?: string;
  tag?: JournalTag;
  takenAt?: Date;
}): Promise<JournalMediaItem> {
  const userId = getCache().userId;
  if (!userId) throw new Error("Önce giriş yapmalısın.");

  const { file, width, height } = await compressImage(input.file);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: "image/jpeg", upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("journal_media")
    .insert({
      user_id: userId,
      storage_path: path,
      caption: input.caption?.trim() || null,
      tag: input.tag ?? "general",
      taken_at: (input.takenAt ?? new Date()).toISOString(),
      width,
      height,
    })
    .select("*")
    .single();
  if (error) {
    // best-effort cleanup
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return rowToItem(data);
}

export async function listJournalMedia(): Promise<JournalMediaItem[]> {
  const userId = getCache().userId;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("journal_media")
    .select("*")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToItem);
}

export async function deleteJournalMedia(item: JournalMediaItem): Promise<void> {
  await supabase.storage.from(BUCKET).remove([item.storagePath]);
  await supabase.from("journal_media").delete().eq("id", item.id);
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

function rowToItem(row: {
  id: string;
  storage_path: string;
  caption: string | null;
  tag: string;
  taken_at: string;
  width: number | null;
  height: number | null;
}): JournalMediaItem {
  return {
    id: row.id,
    storagePath: row.storage_path,
    caption: row.caption,
    tag: (row.tag as JournalTag) ?? "general",
    takenAt: row.taken_at,
    width: row.width,
    height: row.height,
  };
}
