"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, MessageSquare, Calculator, Eye, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/sku/status-badge";
import { ShipmentTimeline } from "@/components/sku/shipment-timeline";
import { SalesBarChart, SalesSummary } from "@/components/sales/sales-overview";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  formatDate,
  DESIGN_STATUS_COLORS,
  DESIGN_STATUS_LABELS,
} from "@/lib/utils";
import type { ClientSku, Design, Note, Message, SkuShipment, SkuSalesReport } from "@/types";

const PRODUCTION_STEPS = [
  { key: "in_review", label: "Review" },
  { key: "sample_pending", label: "Sample" },
  { key: "in_production", label: "Production" },
  { key: "in_transit", label: "Transit" },
  { key: "landed", label: "Landed" },
  { key: "on_sale", label: "On Sale" },
];

interface Props {
  sku: ClientSku & { supplier?: any; warehouse?: any; client?: any };
  designs: Design[];
  notes: Note[];
  messages: Message[];
  shipment: SkuShipment | null;
  salesReports: SkuSalesReport[];
  // "YYYY-MM-DD" from the server, so the chart's date range matches on hydration
  today: string;
}

export function ClientSkuView({
  sku,
  designs,
  notes,
  messages: initialMessages,
  shipment,
  salesReports,
  today,
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<"designs" | "notes" | "messages" | "calculator" | "sales">("designs");
  const [qty, setQty] = useState("100");
  const [sellPrice, setSellPrice] = useState("");

  // The client's own margin: their selling price vs. what they pay us
  const qtyNum = parseInt(qty) || 0;
  const sellPriceNum = parseFloat(sellPrice) || 0;
  const clientPrice = sku.client_price;
  const marginPerUnit = sellPriceNum - clientPrice;
  const marginPct = sellPriceNum > 0 ? (marginPerUnit / sellPriceNum) * 100 : 0;
  const totalProfit = marginPerUnit * qtyNum;

  const currentStepIdx = PRODUCTION_STEPS.findIndex((s) => s.key === sku.status);

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    setSendingMsg(true);
    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientRecord } = await supabase
        .from("clients")
        .select("id")
        .eq("supabase_auth_id", user.id)
        .single();

      if (!clientRecord) return;

      const { data: msg, error } = await supabase
        .from("messages")
        .insert({ sku_id: sku.id, sender_id: clientRecord.id, content: messageText })
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
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{sku.name}</h1>
              <StatusBadge status={sku.status} />
            </div>
            <p className="text-sm text-slate-500 font-mono">{sku.sku_code}</p>
          </div>
        </div>
      </div>

      {/* Production Progress */}
      {sku.status !== "discontinued" && (
        <Card className="mb-6">
          <CardContent className="py-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Production Progress
            </p>
            <div className="flex items-center">
              {PRODUCTION_STEPS.map((step, idx) => {
                const done = idx <= currentStepIdx;
                const active = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          done
                            ? active
                              ? "bg-slate-900 text-white ring-4 ring-slate-200"
                              : "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span
                        className={`mt-1.5 text-xs font-medium ${
                          done ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < PRODUCTION_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mb-4 ${
                          idx < currentStepIdx ? "bg-slate-900" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manufacture & Shipment (read-only) */}
      {shipment && (
        <Card className="mb-6">
          <CardContent className="py-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Manufacture &amp; Shipment
            </p>
            <ShipmentTimeline shipment={shipment} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Details */}
        <div className="col-span-1 space-y-4">
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
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Your Price</p>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(sku.client_price)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">In Stock</p>
                <p className="text-sm text-slate-900">{sku.stock_qty} units</p>
              </div>
              {sku.warehouse && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Warehouse</p>
                  <p className="text-sm text-slate-900">{sku.warehouse.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Since</p>
                <p className="text-sm text-slate-900">{formatDate(sku.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="col-span-2">
          <div className="flex border-b border-slate-200 mb-4">
            {[
              { key: "designs", label: "Designs", icon: FileText },
              { key: "notes", label: "Updates", icon: Eye },
              { key: "messages", label: "Messages", icon: MessageSquare },
              { key: "calculator", label: "Calculator", icon: Calculator },
              { key: "sales", label: "Sales", icon: BarChart3 },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
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

          {/* Designs */}
          {activeTab === "designs" && (
            <div className="space-y-2">
              {designs.length === 0 && (
                <p className="text-sm text-slate-400 py-6 text-center">No design files yet.</p>
              )}
              {designs.map((design) => (
                <div key={design.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{design.file_name}</p>
                      <p className="text-xs text-slate-400">{formatDate(design.uploaded_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={DESIGN_STATUS_COLORS[design.status]}>
                      {DESIGN_STATUS_LABELS[design.status]}
                    </Badge>
                    <a
                      href={design.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {activeTab === "notes" && (
            <div className="space-y-3">
              {notes.length === 0 && (
                <p className="text-sm text-slate-400 py-6 text-center">No updates yet.</p>
              )}
              {notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{note.author}</span>
                    <span className="text-xs text-slate-400">{formatDate(note.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          {activeTab === "messages" && (
            <div className="flex flex-col gap-3">
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    No messages yet. Send a message to the Row1Merch team.
                  </p>
                )}
                {messages.map((msg) => {
                  const isAdmin = (msg.sender as any)?.role === "admin";
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                          isAdmin ? "bg-slate-100 text-slate-900" : "bg-slate-900 text-white"
                        }`}
                      >
                        <p className="text-xs mb-1 opacity-60">
                          {isAdmin ? "Row1Merch" : "You"} · {formatDate(msg.created_at)}
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
                  placeholder="Message the Row1Merch team..."
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

          {/* Sales */}
          {activeTab === "sales" && (
            <div>
              {salesReports.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">
                  No sales data yet. Sales figures appear here once your Row1Merch team
                  connects this product&apos;s online store.
                </p>
              ) : (
                <div className="space-y-6">
                  <SalesSummary
                    reports={salesReports}
                    revenueLabel="Venue Revenue (sold price)"
                    revenueHint="Gross revenue at the venue's selling price"
                  />
                  <SalesBarChart reports={salesReports} endDate={today} />
                </div>
              )}
            </div>
          )}

          {/* Margin Calculator */}
          {activeTab === "calculator" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Your selling price (£)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200 overflow-hidden">
                {/* Per-unit breakdown */}
                <div className="px-5 py-4 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    Per unit
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Your selling price</span>
                    <span className="font-medium text-slate-900">{formatCurrency(sellPriceNum)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Your price from Row1Merch</span>
                    <span className="font-medium text-slate-900">{formatCurrency(clientPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-2 mt-1">
                    <span className="text-slate-700">Your margin per unit</span>
                    <span className={marginPerUnit >= 0 ? "text-green-700" : "text-red-600"}>
                      {formatCurrency(marginPerUnit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Your margin %</span>
                    <span className={`font-semibold ${marginPct >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {sellPriceNum > 0 ? `${marginPct.toFixed(1)}%` : "-"}
                    </span>
                  </div>
                </div>

                {/* Total at quantity */}
                <div className="px-5 py-4 bg-white">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    At {qtyNum.toLocaleString()} units
                  </p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-base font-semibold text-slate-900">Total profit</span>
                    <span className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(totalProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
