import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import type { OrderView } from "@/lib/types";

/** The view only lists photos the client may see. They live in a private bucket, so they turn
 *  into short-lived links here. */
export async function withSignedPhotos(view: OrderView): Promise<OrderView> {
  const paths = view.inspection?.lines.flatMap((l) => l.photos) ?? [];
  const db = serviceClient();
  if (!view.inspection || !paths.length || !db) return view;
  const { data } = await db.storage.from("inspection-photos").createSignedUrls(paths, 900);
  const urls = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return {
    ...view,
    inspection: {
      ...view.inspection,
      lines: view.inspection.lines.map((l) => ({ ...l, photos: l.photos.map((p) => urls.get(p)).filter((u): u is string => !!u) })),
    },
  };
}
