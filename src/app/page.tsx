export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("role")
    .eq("supabase_auth_id", user.id)
    .single();

  if (client?.role === "admin") {
    redirect("/admin");
  } else {
    redirect("/portal");
  }
}
