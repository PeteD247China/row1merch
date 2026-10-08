"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  Upload,
  MessageSquare,
  FileText,
  Lock,
  Eye,
  ImageIcon,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/sku/status-badge";
import { SkuForm } from "@/components/sku/sku-form";
import { ShipmentForm } from "@/components/sku/shipment-form";
import { ShipmentTimeline } from "@/components/sku/shipment-timeline";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  formatDate,
  DESIGN_STATUS_COLORS,
  DESIGN_STATUS_LABELS,
} from "@/lib/utils";
import type {
  SKU,
  Client,
  Supplier,
  Warehouse,
  Design,
  Note,
  Message,
  SkuShipment,
} from "@/types";

interface Props {
  sku: SKU & { supplier?: Supplier; warehouse?: any; client?: any };
  clients: Client[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  designs: Design[];
  notes: Note[];
  messages: Message[];
  shipment: SkuShipment | null;
  isAdmin: boolean;
}

export function SkuDetailClient({
  sku,
  clients,
  suppliers,
  warehouses,
  designs: initialDesigns,
  notes: initialNotes,
  messages: initialMessages,
  shipment: initialShipment,
  isAdmin,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [designs, setDesigns] = useState(initialDesigns);
  const [notes, setNotes] = useState(initialNotes);
  const [messages, setMessages] = useState(initialMessages);
  const [shipment, setShipment] = useState(initialShipment);
  const [noteText, setNoteText] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "messages">("notes");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    if (fileInputRef.current) fileInputRef.current.value = "";

    const body = new FormData();
    body.append("file", file);
    body.append("sku_id", sku.id);

    try {
      const res = await fetch("/api/designs/upload", { method: "POST", body });
      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.error ?? "Upload failed. Please try again.");
        setUploading(false);
        return;
      }

      setDesigns((prev) => [json.design, ...prev]);
    } catch {
      setUploadError("Network error — please check your connection and try again.");
    }

    setUploading(false);
  }

  async function updateDesignStatus(designId: string, status: string) {
    const supabase = createClient();
    await supabase.from("designs").update({ status }).eq("id", designId);
    setDesigns((prev) =>
      prev.map((d) => (d.id === designId ? { ...d, status: status as any } : d))
    );
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const supabase = createClient();

    const { data: note, error } = await supabase
      .from("notes")
      .insert({
        sku_id: sku.id,
        author: "Admin",
        content: noteText,
        is_internal: noteInternal,
      })
      .select()
      .single();

    if (!error && note) {
      setNotes((prev) => [note, ...prev]);
      setNoteText("");
    }
    setSavingNote(false);
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    setSendingMsg(true);
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientRecord } = await supabase
        .from("clients")
        .select("id")
        .eq("supabase_auth_id", user.id)
        .single();

      if (!clientRecord) return;

      const { data: msg, error } = await supabase
        .from("messages")
        .insert({
          sku_id: sku.id,
          sender_id: clientRecord.id,
          content: messageText,
        })
        .select("*, sender:clients(*)")
        .single();

      if (!error && msg) {
        setMessages((prev) => [...prev, msg]);
        setMessageText("");
      }
    } finally {
      setSendingMsg(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">
      {/* ── Header ── */}
      <div>
        <Link
          href="/admin/skus"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SKUs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{sku.name}</h1>
              <StatusBadge status={sku.status} />
            </div>
            <p className="text-sm text-slate-500 font-mono">{sku.sku_code}</p>
          </div>
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              <Edit2 className="h-4 w-4" />
              Edit SKU
            </Button>
          )}
        </div>
      </div>

      {/* ── Designs — always visible ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-slate-500" />
              <CardTitle>Design Files</CardTitle>
              {designs.length > 0 && (
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {designs.length}
                </span>
              )}
            </div>
            {isAdmin && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  onClick={() => {
                    setUploadError(null);
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload Design"}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {uploadError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {uploadError}
            </div>
          )}

          {designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No design files yet</p>
              {isAdmin && (
                <p className="mt-1 text-xs text-slate-400">
                  Click &ldquo;Upload Design&rdquo; above to attach an image or PDF.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="flex items-center justify-between py-3 first:pt-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {design.file_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Uploaded {formatDate(design.uploaded_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <Badge className={DESIGN_STATUS_COLORS[design.status]}>
                      {DESIGN_STATUS_LABELS[design.status]}
                    </Badge>

                    {isAdmin ? (
                      <Select
                        className="w-36 text-xs"
                        value={design.status}
                        onChange={(e) => updateDesignStatus(design.id, e.target.value)}
                      >
                        <option value="uploaded">Uploaded</option>
                        <option value="in_review">In Review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </Select>
                    ) : null}

                    <a
                      href={design.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="View file"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Manufacture & Shipment ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-500" />
            <CardTitle>Manufacture &amp; Shipment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ShipmentTimeline shipment={shipment} />
          {isAdmin && (
            <div className="border-t border-slate-100 pt-5">
              <ShipmentForm skuId={sku.id} shipment={shipment} onSaved={setShipment} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Details + Notes/Messages ── */}
      <div className="grid grid-cols-3 gap-6">
        {/* SKU details */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sku.description && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Description</p>
                  <p className="text-sm text-slate-700">{sku.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Cost Price</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(sku.cost?.cost_price ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Landed Cost / Unit</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(sku.cost?.landed_cost_per_unit ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Client Price</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(sku.client_price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Stock</p>
                  <p
                    className={`text-sm font-medium ${
                      sku.stock_qty <= sku.reorder_point
                        ? "text-red-600"
                        : "text-slate-900"
                    }`}
                  >
                    {sku.stock_qty} units
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Reorder Point</p>
                  <p className="text-sm text-slate-900">{sku.reorder_point}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Client</p>
                <p className="text-sm text-slate-900">
                  {sku.client?.company_name ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Supplier</p>
                <p className="text-sm text-slate-900">{sku.supplier?.name ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Warehouse</p>
                <p className="text-sm text-slate-900">{sku.warehouse?.name ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Created</p>
                <p className="text-sm text-slate-900">{formatDate(sku.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes + Messages */}
        <div className="col-span-2">
          <div className="flex border-b border-slate-200 mb-4">
            {[
              { key: "notes", label: "Notes", icon: Edit2 },
              { key: "messages", label: "Messages", icon: MessageSquare },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as "notes" | "messages")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === key
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Notes */}
          {activeTab === "notes" && (
            <div>
              {isAdmin && (
                <div className="mb-4 space-y-2">
                  <Textarea
                    rows={3}
                    placeholder="Add a note or factory feedback…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={noteInternal}
                        onChange={(e) => setNoteInternal(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <Lock className="h-3.5 w-3.5" />
                      Internal only
                    </label>
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={savingNote || !noteText.trim()}
                    >
                      {savingNote ? "Saving…" : "Add Note"}
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {notes.length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    No notes yet.
                  </p>
                )}
                {notes
                  .filter((n) => isAdmin || !n.is_internal)
                  .map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">
                            {note.author}
                          </span>
                          {note.is_internal && (
                            <Badge className="bg-slate-100 text-slate-500">
                              <Lock className="h-3 w-3 mr-1" />
                              Internal
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatDate(note.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {activeTab === "messages" && (
            <div className="flex flex-col gap-3">
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    No messages yet. Start the conversation.
                  </p>
                )}
                {messages.map((msg) => {
                  const isAdminMsg = (msg.sender as any)?.role === "admin";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                          isAdminMsg
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <p className="text-xs mb-1 opacity-60">
                          {(msg.sender as any)?.company_name ?? "Unknown"} ·{" "}
                          {formatDate(msg.created_at)}
                        </p>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Textarea
                  rows={2}
                  placeholder="Type a message…"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  className="self-end"
                  onClick={handleSendMessage}
                  disabled={sendingMsg || !messageText.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit SKU"
        size="lg"
      >
        <SkuForm
          sku={sku}
          clients={clients}
          suppliers={suppliers}
          warehouses={warehouses}
          onSuccess={() => {
            setShowEditModal(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}
