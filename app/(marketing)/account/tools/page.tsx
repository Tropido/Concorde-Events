import { redirect } from "next/navigation";

// The margin calculator now lives in the professional space.
export default function ToolsRedirect() {
  redirect("/account/pro");
}
