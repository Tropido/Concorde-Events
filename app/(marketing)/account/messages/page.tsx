import { getT } from "@/lib/i18n/server";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MessagesView, type Thread } from "./messages-view";

export default async function AccountMessagesPage() {
  const [{ t }, viewer] = await Promise.all([getT(), requireViewer("/account/messages")]);
  const supabase = await createClient();
  // RLS returns only this user's threads and never staff-internal replies.
  const [{ data, error }, { data: requests }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, subject, body, status, created_at, message_replies(id, body, author_id, created_at)")
      .eq("profile_id", viewer.id)
      .order("created_at", { ascending: false }),
    supabase.from("rental_requests").select("id, reference").eq("user_id", viewer.id).order("created_at", { ascending: false }),
  ]);
  if (error) throw error;

  return (
    <section aria-label={t.account.messages}>
      <MessagesView viewerId={viewer.id} threads={(data ?? []) as Thread[]} requests={requests ?? []} />
    </section>
  );
}
