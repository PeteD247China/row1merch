import { Badge } from "@/components/ui/badge";
import { SKU_STATUS_COLORS, SKU_STATUS_LABELS } from "@/lib/utils";
import type { SkuStatus } from "@/types";

export function StatusBadge({ status }: { status: SkuStatus }) {
  return (
    <Badge className={SKU_STATUS_COLORS[status]}>
      {SKU_STATUS_LABELS[status]}
    </Badge>
  );
}
