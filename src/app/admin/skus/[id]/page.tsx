import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SkuDetailClient } from "./sku-detail-client";
import { SALES_INTEGRATION_COLUMNS, toSalesIntegration } from "@/lib/sales";

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
    { data: integrationRow },
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
    // The token is selected only to know whether one is stored; it is
    // stripped by toSalesIntegration() before reaching the client component
    supabase
      .from("sku_sales_integrations")
      .select(`${SALES_INTEGRATION_COLUMNS}, shopify_access_token`)
      .eq("sku_id", id)
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
      salesIntegration={integrationRow ? toSalesIntegration(integrationRow) : null}
      isAdmin={true}
    />
  );
}
