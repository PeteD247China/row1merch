import { createClient } from "@/lib/supabase/server";
import { SuppliersPageClient } from "./suppliers-page-client";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  return (
    <div className="p-8">
      <SuppliersPageClient suppliers={suppliers ?? []} />
    </div>
  );
}
