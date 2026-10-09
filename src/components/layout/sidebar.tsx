"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  Warehouse,
  BarChart3,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/skus", label: "SKUs", icon: Package },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/admin/warehouses", label: "Warehouses", icon: Warehouse },
  { href: "/admin/sales", label: "Sales", icon: BarChart3 },
];

const clientLinks = [
  { href: "/portal", label: "My Products", icon: Package },
];

interface SidebarProps {
  isAdmin: boolean;
  userName: string;
}

export function Sidebar({ isAdmin, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const links = isAdmin ? adminLinks : clientLinks;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-bold">
          OM
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Ovation Merch</p>
          <p className="text-xs text-slate-500">{isAdmin ? "Admin" : "Client Portal"}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-3 py-3">
        <div className="mb-2 px-3 py-1">
          <p className="text-xs font-medium text-slate-900 truncate">{userName}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
