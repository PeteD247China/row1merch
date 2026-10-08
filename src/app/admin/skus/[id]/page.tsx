import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SkuDetailClient } from "./sku-detail-client";

export default async function SkuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: sku },
    { data: clients },
    { data: suppliers },
    { data: warehouses },
    { data: designs },
    { data: notes },
    { data: messages },
    { data: shipment },
  ] = await Promise.all([
    supabase
      .from("skus")
      .select("*, supplier:suppliers(*), warehouse:warehouses(*), client:clients(*), cost:sku_costs(*)")
      .eq("id", id)
      .single(),
    supabase.from("clients").select("*").eq("role", "client"),
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("warehouses").select("*").order("name"),
    supabase
      .from("designs")
      .select("*")
      .eq("sku_id", id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("notes")
      .select("*")
      .eq("sku_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("*, sender:clients(*)")
      .eq("sku_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("sku_shipments")
      .select("*, notes:sku_shipment_notes(destination_notes)")
      .eq("sku_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!sku) notFound();

  return (
    <SkuDetailClient
      sku={sku}
      clients={clients ?? []}
      suppliers={suppliers ?? []}
      warehouses={warehouses ?? []}
      designs={designs ?? []}
      notes={notes ?? []}
      messages={messages ?? []}
      shipment={shipment}
      isAdmin={true}
    />
  );
}
