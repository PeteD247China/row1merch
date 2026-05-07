import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Verify the user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const skuId = formData.get("sku_id") as string | null;

  if (!file || !skuId) {
    return NextResponse.json({ error: "Missing file or sku_id" }, { status: 400 });
  }

  // Validate file type
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "Only images (JPEG, PNG, GIF, WEBP) and PDFs are allowed" },
      { status: 400 }
    );
  }

  // Validate file size (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
  }

  // Use the service role client to bypass storage RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify the SKU exists (and the requester has access to it via the user's session)
  const { data: sku, error: skuError } = await supabase
    .from("skus")
    .select("id")
    .eq("id", skuId)
    .single();

  if (skuError || !sku) {
    return NextResponse.json({ error: "SKU not found or access denied" }, { status: 404 });
  }

  // Build a unique storage path
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `${skuId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Upload to storage using service role (bypasses bucket RLS)
  const arrayBuffer = await file.arrayBuffer();
  const { error: storageError } = await admin.storage
    .from("designs")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${storageError.message}` },
      { status: 500 }
    );
  }

  // Get the public URL
  const { data: { publicUrl } } = admin.storage
    .from("designs")
    .getPublicUrl(storagePath);

  // Insert the design record
  const { data: design, error: insertError } = await admin
    .from("designs")
    .insert({
      sku_id: skuId,
      file_url: publicUrl,
      file_name: file.name,
      status: "uploaded",
    })
    .select()
    .single();

  if (insertError) {
    // Roll back the storage upload so we don't leave orphaned files
    await admin.storage.from("designs").remove([storagePath]);
    return NextResponse.json(
      { error: `Failed to save design record: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ design });
}
