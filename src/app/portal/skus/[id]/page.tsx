import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ClientSkuView } from "./client-sku-view";

export default async function ClientSkuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientRecord } = await supabase
    .from("clients")
    .select("id")
    .eq("supabase_auth_id", user.id)
    .single();

  if (!clientRecord) redirect("/login");

  const { data: sku } = await supabase
    .from("skus")
    .select("*, supplier:suppliers(*), warehouse:warehouses(*), client:clients(*)")
    .eq("id", id)
    .eq("client_id", clientRecord.id)
    .single();

  if (!sku) notFound();

  const [
    { data: designs },
    { data: notes },
    { data: messages },
  ] = await Promise.all([
    supabase
      .from("designs")
      .select("*")
      .eq("sku_id", id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("notes")
      .select("*")
      .eq("sku_id", id)
      .eq("is_internal", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*, sender:clients(*)")
      .eq("sku_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <ClientSkuView
      sku={sku}
      designs={designs ?? []}
      notes={notes ?? []}
      messages={messages ?? []}
    />
  );
}
