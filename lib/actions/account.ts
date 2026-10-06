"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export async function toggleFavourite(productId: string, on: boolean) {
  if (!z.string().uuid().safeParse(productId).success) return { ok: false };
  const viewer = await getViewer();
  if (!viewer) return { ok: false };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("favourites").upsert({ profile_id: viewer.id, product_id: productId }, { ignoreDuplicates: true })
    : await supabase.from("favourites").delete().eq("profile_id", viewer.id).eq("product_id", productId);
  revalidatePath("/account/favourites");
  return { ok: !error };
}
