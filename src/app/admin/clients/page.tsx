import { createClient } from "@/lib/supabase/server";
import { ClientsPageClient } from "./clients-page-client";

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("role", "client")
    .order("company_name");

  const { data: skus } = await supabase
    .from("skus")
    .select("id, name, sku_code, status, client_id");

  return (
    <div className="p-8">
      <ClientsPageClient clients={clients ?? []} skus={skus ?? []} />
    </div>
  );
}
