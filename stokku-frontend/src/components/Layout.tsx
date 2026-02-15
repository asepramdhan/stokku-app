/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, Bell, AlertCircle, ChevronRight, ShoppingCart, Box, ShoppingBag, Plus, Search, X, Package2, User, Settings, LogOut, Lock, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Sidebar from "./Sidebar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useDarkMode } from "@/hooks/useDarkMode";

export default function Layout() {
  const location = useLocation(),
    [open, setOpen] = useState(false),
    [lowStockCount, setLowStockCount] = useState(0),
    [isFabOpen, setIsFabOpen] = useState(false),
    [stats, setStats] = useState<any>(null),
    [isLoading, setIsLoading] = useState(true),
    [notifSearch, setNotifSearch] = useState(""),
    { isDark, toggle } = useDarkMode(),
    // 1. Ambil data dari storage (kasih fallback kalau kosong)
    userName = localStorage.getItem("user_name") || "User",
    userEmail = localStorage.getItem("user_email") || "user@stokku.id",

    // 2. Ambil inisial nama (Misal: "Budi" jadi "B")
    userInitial = userName.charAt(0).toUpperCase(),

    handleManualLock = () => {
      // 1. Hapus status "unlocked" dari session storage
      sessionStorage.removeItem("app_unlocked");

      // 2. Refresh halaman atau arahkan ulang agar PinGuard mendeteksi status terkunci
      window.location.reload();

      // Tips: reload() lebih aman karena akan menghapus data sensitif 
      // yang mungkin masih tersimpan di memory/state React
    };

  // Ambil data stok menipis dari backend
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/dashboard/stats`)
      .then(res => res.json())
      .then(data => setLowStockCount(data.lowStock?.length || 0))
      .catch(err => console.error(err));
  }, [location.pathname]);

  // Fetch Data Lengkap untuk Notifikasi
  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/stats`),
        data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [location.pathname]);

  // Fungsi Quick Add (Sama seperti di Dashboard)
  const handleQuickAdd = async (productId: number, productName: string) => {
    try {
      const resPrice = await fetch(`${import.meta.env.VITE_API_URL}/shopping/last-price/${productId}`),
        priceData = await resPrice.json(),
        recommendedPrice = priceData.last_price;

      toast.promise(
        fetch(`${import.meta.env.VITE_API_URL}/shopping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId, qty: 1, buy_price: recommendedPrice }),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Gagal menambah");
          }
          return res.json();
        }),
        {
          loading: `Menyiapkan belanja ${productName}...`,
          success: `${productName} masuk daftar belanja!`,
          error: (err) => err.message,
        }
      );
    } catch (err) {
      console.error(err);
    }
  },

    // Fungsi Bulk Add
    handleBulkQuickAdd = async () => {
      const ids = filteredLowStock.map((p: any) => p.id);
      if (ids.length === 0) return;

      toast.promise(
        fetch(`${import.meta.env.VITE_API_URL}/shopping/add-bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: ids }),
        }).then(async (res) => {
          if (!res.ok) throw new Error("Gagal memproses bulk");
          return res.json();
        }),
        {
          loading: `Mendaftarkan ${ids.length} barang ke belanja...`,
          success: () => {
            // Jika sedang di halaman dashboard atau shopping, mungkin perlu refresh data
            return "Semua barang masuk rencana belanja! ✅";
          },
          error: "Gagal memproses",
        }
      );
    },

    // LOGIKA FILTER BARANG KRITIS
    filteredLowStock = stats?.lowStock?.filter((item: any) =>
      item.name.toLowerCase().includes(notifSearch.toLowerCase())
    ) || [],

    // LOGIKA NOTIFIKASI
    handleLogout = () => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    };

  return (
    <div className="flex min-h-screen bg-slate-50/50 flex-col md:flex-row font-sans dark:bg-slate-900">

      {/* SIDEBAR DESKTOP (Tetap bersih tanpa lonceng) */}
      <aside className="hidden md:flex w-64 border-r bg-white fixed h-full flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:bg-slate-800">
        <Sidebar />
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 flex flex-col transition-all duration-300">

        {/* --- TOP NAVBAR (LOKASI BARU LONCENG) --- */}
        <header className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between shadow-sm dark:bg-slate-800">

          {/* Bagian Kiri: Breadcrumb / Title Halaman */}
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu size={20} /></Button></SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 border-none"><Sidebar onClose={() => setOpen(false)} /></SheetContent>
              </Sheet>
            </div>
            <h2 className="hidden md:block text-sm font-bold text-slate-400 capitalize">
              Pages <span className="mx-2 text-slate-300 dark:text-slate-600">/</span> <span className="text-slate-800 dark:text-slate-200">{location.pathname.replace("/", "") || "Dashboard"}</span>
            </h2>
          </div>

          {/* Bagian Kanan: Notifikasi & Profil */}
          <div className="flex items-center gap-3">

            {/* SEARCH RINGKAS (Opsional) */}
            {/* <div className="hidden lg:flex items-center bg-slate-100 px-3 py-1.5 rounded-xl border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-all">
              <Search size={14} className="text-slate-400" />
              <input type="text" placeholder="Quick search..." className="bg-transparent border-none text-[11px] focus:ring-0 w-32 outline-none ml-2" />
            </div> */}

            {/* LONCENG NOTIFIKASI (Tampilan Premium) */}
            <Popover onOpenChange={() => setNotifSearch("")}> {/* Reset pencarian saat popover ditutup */}
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors dark:hover:bg-slate-700">
                  <Bell size={20} className={cn(lowStockCount > 0 ? "text-red-500 animate-ring dark:text-red-400" : "text-slate-400 dark:text-slate-500")} />
                  {lowStockCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full dark:bg-red-400">
                      {lowStockCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>

              <PopoverContent className="w-80 p-0 mr-4 mt-2 rounded-2xl shadow-2xl border-slate-100 overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                {/* HEADER POPOVER */}
                <div className="bg-slate-900 p-4 flex justify-between items-center dark:bg-slate-800">
                  <h3 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 dark:text-slate-200">
                    <AlertCircle size={14} className="text-red-400 dark:text-red-500" /> Perlu Re-stok
                  </h3>
                  {lowStockCount > 0 && (
                    <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold dark:bg-red-400/20">
                      {lowStockCount} Item
                    </span>
                  )}
                </div>

                {/* 3. INPUT SEARCH DI DALAM POPOVER */}
                <div className="px-4 py-2 relative group border-b border-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" />
                  <input
                    type="text"
                    placeholder="Cari barang kritis..."
                    value={notifSearch}
                    onChange={(e) => setNotifSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:bg-white focus:border-slate-200 focus:ring-0 outline-none dark:bg-slate-800 dark:border-slate-600 dark:placeholder:text-slate-600"
                  />
                  {notifSearch && (
                    <button
                      onClick={() => setNotifSearch("")}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors dark:text-slate-600 dark:hover:text-slate-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* BODY POPOVER (LIST BARANG) */}
                <div className="max-h-[350px] overflow-y-auto bg-white p-2 dark:bg-slate-800">
                  {isLoading ? (
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : filteredLowStock.length > 0 ? (
                    <div className="space-y-1">
                      {filteredLowStock.map((item: any, i: number) => {
                        const percentage = Math.min((item.quantity / 10) * 100, 100);
                        const isCritical = item.quantity <= 2;

                        return (
                          <div
                            key={i}
                            onClick={() => handleQuickAdd(item.id, item.name)}
                            className="group cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-all active:scale-[0.98] dark:hover:bg-slate-700"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 truncate w-40 dark:text-slate-200">
                                  {item.name}
                                </span>
                                <span className="text-[10px] font-black tracking-tight text-slate-400 dark:text-slate-500">
                                  <span className="text-[10px] font-medium">Sisa:</span> {item.quantity} <span className="text-[10px] font-medium">Pcs</span>
                                </span>
                              </div>
                              <div className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                                isCritical ? "bg-red-100 text-red-600 dark:bg-red-50 dark:text-red-600" : "bg-orange-100 text-orange-600 dark:bg-orange-50 dark:text-orange-600"
                              )}>
                                {isCritical ? 'Kritis' : 'Menipis'}
                              </div>
                            </div>
                            {/* PROGRESS BAR KECIL */}
                            <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-700">
                              <div
                                className={cn("h-full transition-all duration-1000", isCritical ? "bg-red-500 dark:bg-red-600" : "bg-orange-400 dark:bg-orange-500")}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      {notifSearch ? <Search size={24} className="text-slate-200 mb-2 dark:text-slate-400" /> : <Package2 size={24} className="text-slate-200 mb-2 dark:text-slate-400" />}
                      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        {notifSearch ? `"${notifSearch}" tidak ditemukan` : "Gudang aman!"}
                      </p>
                    </div>
                  )}
                </div>

                {/* FOOTER POPOVER */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 dark:bg-slate-800 dark:border-slate-700">
                  {/* TOMBOL BULK ADD */}
                  {filteredLowStock.length > 0 && (
                    <button
                      onClick={handleBulkQuickAdd}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold transition-all border border-slate-200 hover:border-blue-200 shadow-sm dark:text-slate-200 dark:hover:text-slate-100 dark:hover:bg-slate-700 dark:hover:border-slate-600 dark:bg-slate-800"
                    >
                      TAMBAH SEMUA ({filteredLowStock.length})
                    </button>
                  )}
                  {/* TOMBOL MANAJEMEN BELANJA */}
                  <Link
                    to="/shopping"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold transition-all border border-slate-200 hover:border-blue-200 shadow-sm dark:text-slate-200 dark:hover:text-slate-100 dark:hover:bg-slate-700 dark:hover:border-slate-600 dark:bg-slate-800"
                  >
                    <ShoppingCart size={14} />
                    Manajemen Belanja <ChevronRight size={14} />
                  </Link>
                </div>
              </PopoverContent>
            </Popover>

            {/* TOMBOL LOCK */}
            <button
              onClick={handleManualLock}
              className="flex items-center justify-center h-9 w-9 text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors group dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              <Lock size={18} className="group-hover:animate-pulse" />
            </button>

            {/* TOMBOL DARKMODE */}
            <button
              onClick={toggle}
              className="flex items-center justify-center h-9 w-9 text-slate-600 hover:bg-slate-100 rounded-lg transition-all dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {isDark ? (
                <>
                  <Sun size={18} className="text-yellow-500" />
                </>
              ) : (
                <>
                  <Moon size={18} className="text-blue-600" />
                </>
              )}
            </button>

            <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block dark:bg-slate-700" />

            {/* AVATAR DENGAN DROPDOWN LOGOUT */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-100 border-2 border-white cursor-pointer hover:scale-105 transition-transform dark:border-none dark:shadow-none">
                  {/* 💡 TAMPILKAN INISIAL */}
                  {userInitial}
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56 mt-2 mr-4 rounded-2xl shadow-2xl border-slate-100 p-2 dark:bg-slate-800 dark:border-slate-700" align="end">
                <DropdownMenuLabel className="p-3">
                  <div className="flex flex-col gap-1">
                    {/* 💡 TAMPILKAN NAMA ASLI */}
                    <p className="text-sm font-bold text-slate-800 capitalize dark:text-slate-100">{userName}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate dark:text-slate-500">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-slate-50 dark:bg-slate-700" />

                <DropdownMenuItem className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors dark:hover:bg-slate-700">
                  <User size={16} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-200">Profil Saya</span>
                </DropdownMenuItem>

                <Link to="/settings">
                  <DropdownMenuItem className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors dark:hover:bg-slate-700">
                    <Settings size={16} className="text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-200">Pengaturan Akun</span>
                  </DropdownMenuItem>
                </Link>

                <DropdownMenuSeparator className="bg-slate-50 mb-2 dark:bg-slate-700" />

                {/* 🚀 TOMBOL LOGOUT */}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 p-3 rounded-xl cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 transition-colors focus:bg-red-100 focus:text-red-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100 dark:focus:bg-slate-600 dark:focus:text-slate-100"
                >
                  <LogOut size={16} />
                  <span className="text-xs font-bold">Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="p-4 md:p-10">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>

        {/* --- QUICK ACTION FAB (TOMBOL MELAYANG) --- */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">

          {/* Tombol Utama */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform ${isFabOpen ? "bg-slate-800 rotate-45 scale-90 dark:bg-slate-700" : "bg-blue-600 hover:bg-blue-700 hover:scale-110 dark:bg-blue-600 dark:hover:bg-blue-700 dark:hover:scale-110"
              }`}
          >
            <Plus size={28} className="text-white" />
          </button>

          {/* Menu Pilihan (Muncul ke Atas) */}
          {isFabOpen && (
            <div className="flex flex-col-reverse items-end gap-3 mb-2 animate-in fade-in slide-in-from-bottom-10 duration-300">

              {/* Tambah Penjualan */}
              <Link to="/sales" onClick={() => setIsFabOpen(false)} className="group flex items-center gap-3">
                <span className="bg-white px-3 py-1.5 rounded-lg border shadow-sm text-[11px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity dark:text-slate-200 dark:bg-slate-800">
                  Input Penjualan
                </span>
                <div className="h-11 w-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-colors dark:bg-emerald-400 dark:hover:bg-emerald-500">
                  <ShoppingBag size={20} />
                </div>
              </Link>

              {/* Tambah Produk */}
              <Link to="/master" onClick={() => setIsFabOpen(false)} className="group flex items-center gap-3">
                <span className="bg-white px-3 py-1.5 rounded-lg border shadow-sm text-[11px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity dark:text-slate-200 dark:bg-slate-800">
                  Master Produk
                </span>
                <div className="h-11 w-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600">
                  <Box size={20} />
                </div>
              </Link>

              {/* Buat Rencana Belanja */}
              <Link to="/shopping" onClick={() => setIsFabOpen(false)} className="group flex items-center gap-3">
                <span className="bg-white px-3 py-1.5 rounded-lg border shadow-sm text-[11px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity dark:text-slate-200 dark:bg-slate-800">
                  Rencana Belanja
                </span>
                <div className="h-11 w-11 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors dark:bg-orange-400 dark:hover:bg-orange-500">
                  <ShoppingCart size={20} />
                </div>
              </Link>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}