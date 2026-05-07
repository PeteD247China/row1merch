import { createClient } from "@/lib/supabase/server";
import { WarehousesPageClient } from "./warehouses-page-client";

export default async function WarehousesPage() {
  const supabase = await createClient();
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("*")
    .order("name");

  return (
    <div className="p-8">
      <WarehousesPageClient warehouses={warehouses ?? []} />
    </div>
  );
}
