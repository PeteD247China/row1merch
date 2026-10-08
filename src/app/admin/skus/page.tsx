import { createClient } from "@/lib/supabase/server";
import { SkuTableClient } from "./sku-table-client";

export default async function SkusPage() {
  const supabase = await createClient();

  const [
    { data: skus },
    { data: clients },
    { data: suppliers },
    { data: warehouses },
  ] = await Promise.all([
    supabase
      .from("skus")
      .select("*, supplier:suppliers(id,name), warehouse:warehouses(id,name), client:clients(id,company_name), cost:sku_costs(*)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("*").eq("role", "client"),
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("warehouses").select("*").order("name"),
  ]);

  return (
    <div className="p-8">
      <SkuTableClient
        skus={skus ?? []}
        clients={clients ?? []}
        suppliers={suppliers ?? []}
        warehouses={warehouses ?? []}
      />
    </div>
  );
}
