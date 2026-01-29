/* eslint-disable react-hooks/static-components */
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Box, Store,
  ShoppingBag, BarChart3, Menu, Package2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Daftar Belanja", path: "/shopping", icon: ShoppingCart },
  { name: "Master Produk", path: "/master", icon: Box },
  { name: "Toko", path: "/stores", icon: Store },
  { name: "Penjualan", path: "/sales", icon: ShoppingBag },
  { name: "Analisa Margin", path: "/margin", icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Komponen Navigasi agar tidak nulis dua kali
  const NavLinks = () => (
    <nav className="flex flex-col gap-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)} // Tutup drawer saat link diklik
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
              ? "bg-blue-600 text-white shadow-blue-200 shadow-md"
              : "text-slate-600 hover:bg-slate-100"
              }`}
          >
            <Icon size={20} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 flex-col md:flex-row">
      {/* --- HEADER MOBILE --- */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Package2 className="text-blue-600" />
          <span className="font-bold text-lg tracking-tighter">STOKKU</span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader className="text-left mb-6">
              <SheetTitle className="text-2xl font-bold text-blue-600">Menu Navigasi</SheetTitle>
            </SheetHeader>
            <NavLinks />
          </SheetContent>
        </Sheet>
      </header>

      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden md:flex w-64 bg-white border-r shadow-sm flex-col fixed h-full">
        <div className="p-6 flex items-center gap-2">
          <Package2 className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold text-blue-600 tracking-tighter">STOKKU PRO</h1>
        </div>
        <div className="flex-1 px-4">
          <NavLinks />
        </div>
        <div className="p-4 border-t text-xs text-slate-400 text-center">
          v1.0.0 Stable Build
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        {/* Kontainer agar konten tidak terlalu lebar di layar raksasa */}
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}