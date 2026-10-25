import { requireViewer } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const viewer = await requireViewer("/account/profile");
  return <ProfileForm viewer={viewer} />;
}
