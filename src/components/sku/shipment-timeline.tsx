import { Factory, Truck, Ship, PackageCheck, MapPin } from "lucide-react";
import { formatDay, SHIPMENT_DESTINATION_LABELS } from "@/lib/utils";
import type { SkuShipment } from "@/types";

interface Props {
  shipment: SkuShipment | null;
}

function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Read-only journey: In Production → Dispatched → In Transit → Arrived.
// A stage is reached once its date is today or earlier; future dates show as planned.
export function ShipmentTimeline({ shipment }: Props) {
  const s = shipment;
  const today = localToday();
  const reached = (day: string | null | undefined) => !!day && day <= today;

  const currentIdx = reached(s?.actual_arrival_date)
    ? 3
    : reached(s?.dispatch_date)
    ? 2
    : reached(s?.production_start_date)
    ? 0
    : -1;

  const dateLine = (label: string, day: string | null | undefined) =>
    day ? `${reached(day) ? label : `Planned ${label.toLowerCase()}`} ${formatDay(day)}` : null;

  const steps = [
    {
      label: "In Production",
      icon: Factory,
      lines: [
        dateLine("Started", s?.production_start_date),
        s?.estimated_production_complete &&
          `Est. complete ${formatDay(s.estimated_production_complete)}`,
      ],
    },
    {
      label: "Dispatched",
      icon: Truck,
      lines: [dateLine("Dispatched", s?.dispatch_date)],
    },
    {
      label: "In Transit",
      icon: Ship,
      lines: [
        s?.estimated_transit_days != null && `${s.estimated_transit_days} days transit`,
        s?.estimated_arrival_date && `Est. arrival ${formatDay(s.estimated_arrival_date)}`,
      ],
    },
    {
      label: "Arrived",
      icon: PackageCheck,
      lines: [dateLine("Arrived", s?.actual_arrival_date)],
    },
  ];

  return (
    <div>
      <div className="flex items-start">
        {steps.map((step, idx) => {
          const done = idx <= currentIdx;
          const active = idx === currentIdx;
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center w-28 text-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    done
                      ? active
                        ? "bg-slate-900 text-white ring-4 ring-slate-200"
                        : "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`mt-2 text-xs font-semibold ${
                    done ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                {step.lines.filter(Boolean).map((line) => (
                  <span key={line as string} className="mt-0.5 text-xs text-slate-500">
                    {line}
                  </span>
                ))}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mt-[18px] ${
                    idx < currentIdx ? "bg-slate-900" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {s?.destination && (
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 text-slate-400" />
          <span>
            Destination:{" "}
            <span className="font-medium text-slate-900">
              {SHIPMENT_DESTINATION_LABELS[s.destination]}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
