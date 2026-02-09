import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Box, Store,
  ShoppingBag, BarChart3, Package2,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    group: "Utama",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    group: "Inventori",
    items: [
      { name: "Master Produk", path: "/master", icon: Box },
      { name: "Daftar Belanja", path: "/shopping", icon: ShoppingCart },
    ]
  },
  {
    group: "Penjualan",
    items: [
      { name: "Toko / Channel", icon: Store, path: "/stores" },
      { name: "Transaksi", icon: ShoppingBag, path: "/sales" },
      { name: "Analisa Margin", icon: BarChart3, path: "/margin" },
    ]
  },
  {
    group: "Pencatatan",
    items: [
      { name: "Pencatatan Toko", icon: BookOpen, path: "/records" }
    ]
  }
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      {/* 1. LOGO SECTION */}
      <div className="flex h-20 items-center gap-3 px-8">
        <div className="bg-blue-600 dark:bg-blue-800 p-2 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none">
          <Package2 className="text-white" size={20} />
        </div>
        <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-white">
          <Link to="/">
            STOKKU<span className="text-blue-600">.id</span>
          </Link>
        </span>
      </div>

      {/* 2. NAVIGATION (FLEX-1 agar mendorong footer ke bawah) */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigation.map((section) => (
          <div key={section.group}>
            <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {section.group}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-blue-600 dark:bg-blue-800 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-white"
                    )}
                  >
                    <item.icon size={18} className={cn(isActive ? "text-white" : "text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white")} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* --- INI KODE YANG KAMU MAU --- */}
      <div className="p-4 border-t text-xs text-slate-400 dark:text-slate-500 text-center">
        v1.0.0 Stable Build
      </div>
    </div>
  );
}