import type { PredictionHistoryRow, SavePredictionInput } from "../types/database";
import { getSupabase } from "./supabase";

const HISTORY_TABLE = "prediction_history";
const BUCKET = "prediction-images";

function isMissingRelation(error: { message?: string; code?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

function isMissingBucket(error: { message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("bucket") || message.includes("not found");
}

async function uploadPrivateImage(
  userId: string,
  recordId: string,
  file: File,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${recordId}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    if (isMissingBucket(error)) {
      console.error(
        "[AgriSense] Image storage is not configured. Prediction metadata will still be saved.",
        error.message,
      );
      return null;
    }
    throw error;
  }
  return path;
}

export async function createSignedImageUrl(
  imagePath: string | null,
): Promise<string | null> {
  if (!imagePath) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(imagePath, 60 * 10);
  if (error) {
    console.error("[AgriSense] Could not create a signed image URL.", error.message);
    return null;
  }
  return data.signedUrl;
}

export async function savePrediction(
  userId: string,
  input: SavePredictionInput,
): Promise<PredictionHistoryRow> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured, so history cannot be saved.");
  }

  const insertPayload = {
    user_id: userId,
    predicted_class: input.predictedClass,
    confidence: input.confidence,
    probabilities: input.probabilities,
    image_path: null as string | null,
  };

  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    if (isMissingRelation(error)) {
      throw new Error(
        "The prediction_history table is not available yet. Apply the SQL migration in supabase/migrations, then try again.",
      );
    }
    throw new Error(error.message || "Could not save this prediction.");
  }

  const row = data as PredictionHistoryRow;

  if (input.imageFile) {
    try {
      const imagePath = await uploadPrivateImage(userId, row.id, input.imageFile);
      if (imagePath) {
        const { data: updated, error: updateError } = await supabase
          .from(HISTORY_TABLE)
          .update({ image_path: imagePath })
          .eq("id", row.id)
          .eq("user_id", userId)
          .select()
          .single();
        if (!updateError && updated) {
          return updated as PredictionHistoryRow;
        }
      }
    } catch (uploadError) {
      console.error("[AgriSense] Saved the prediction, but image upload failed.", uploadError);
    }
  }

  return row;
}

export async function listPredictions(userId: string): Promise<PredictionHistoryRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingRelation(error)) {
      throw new Error(
        "Prediction history is not available yet. Apply the SQL migration in supabase/migrations.",
      );
    }
    throw new Error(error.message || "Could not load prediction history.");
  }

  return (data ?? []) as PredictionHistoryRow[];
}

export async function getPrediction(
  userId: string,
  id: string,
): Promise<PredictionHistoryRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load this prediction.");
  }
  return (data as PredictionHistoryRow | null) ?? null;
}

export async function deletePrediction(userId: string, row: PredictionHistoryRow): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (row.image_path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([row.image_path]);
    if (storageError) {
      console.error("[AgriSense] Could not delete stored image.", storageError.message);
    }
  }

  const { error } = await supabase
    .from(HISTORY_TABLE)
    .delete()
    .eq("id", row.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Could not delete this record.");
  }
}

export async function upsertProfile(userId: string, fullName: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: fullName,
  });
  if (error) {
    if (isMissingRelation(error)) {
      throw new Error(
        "The profiles table is not available yet. Apply the SQL migration in supabase/migrations.",
      );
    }
    throw new Error(error.message || "Could not update profile.");
  }
}

export async function getProfile(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error)) return null;
    throw new Error(error.message || "Could not load profile.");
  }
  return data;
}
