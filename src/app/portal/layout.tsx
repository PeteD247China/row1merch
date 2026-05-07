import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("role, company_name, email")
    .eq("supabase_auth_id", user.id)
    .single();

  if (!client) redirect("/login");

  // Admins go to admin panel
  if (client.role === "admin") redirect("/admin");

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar isAdmin={false} userName={client.company_name || client.email} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
