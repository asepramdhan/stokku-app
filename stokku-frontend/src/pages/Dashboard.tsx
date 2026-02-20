/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ShoppingBag, Landmark, Package, ArrowUpRight, ShoppingCart, Box, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_DASHBOARD = `${import.meta.env.VITE_API_URL}/dashboard/stats`,
  COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null),
    [isLoading, setIsLoading] = useState(true),
    [range, setRange] = useState(localStorage.getItem("dashboard_range") || "all"),
    // 💡 Buat fungsi helper biar gak capek ngetik header terus
    getHeaders = () => ({
      "Authorization": `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    });

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_DASHBOARD}?range=${range}`, { headers: getHeaders() });

        // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [range]);

  // Simpan ke storage tiap kali range berubah
  useEffect(() => {
    localStorage.setItem("dashboard_range", range);
  }, [range]);

  const handleQuickAdd = async (productId: number, productName: string) => {
    try {
      // 1. Ambil harga terakhir dari API baru kita
      const resPrice = await fetch(`${import.meta.env.VITE_API_URL}/shopping/last-price/${productId}`, { headers: getHeaders() });

      // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
      if (resPrice.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const priceData = await resPrice.json(),
        recommendedPrice = priceData.last_price;

      toast.promise(
        fetch(`${import.meta.env.VITE_API_URL}/shopping`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ product_id: productId, qty: 1, buy_price: recommendedPrice }),
        }).then(async (res) => {

          // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
          if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "/login";
            return;
          }

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Gagal menambah");
          }
          return res.json();
        }),
        {
          loading: `Menyiapkan rencana belanja ${productName}...`,
          success: `${productName} masuk ke belanja (Harga: Rp ${recommendedPrice.toLocaleString()})`,
          error: (err) => err.message,
        }
      );
    }
    catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DENGAN FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ringkasan Bisnis</h1>
          <p className="text-slate-500 text-sm dark:text-slate-400">Update terakhir: {isLoading ? "..." : new Date().toLocaleString('id-ID')}</p>
        </div>
        {/* DROPDOWN FILTER */}
        <div className="flex items-center gap-2 bg-white border p-1.5 rounded-lg shadow-sm w-full md:w-auto dark:bg-slate-800">
          <Calendar size={16} className="text-slate-400 ml-2 dark:text-slate-500" />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-sm w-full font-bold bg-transparent outline-none pr-4 cursor-pointer dark:bg-slate-800"
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
          </select>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-600 text-white border-none shadow-blue-200 shadow-lg dark:shadow-none dark:bg-blue-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium opacity-80">Total Omset</CardTitle>
            <Landmark size={18} className="opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {isLoading ? "..." : Number(stats?.revenue || 0).toLocaleString()}</div>
            <p className="text-xs opacity-70 mt-1">+12% dari bulan lalu</p>
          </CardContent>
        </Card>

        <Card className="dark:border-none dark:bg-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pesanan</CardTitle>
            <ShoppingBag size={18} className="text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats?.orders}</div>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1 dark:text-green-400"><ArrowUpRight size={12} /> 5 hari ini</p>
          </CardContent>
        </Card>

        <Card className="dark:border-none dark:bg-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Aset Stok</CardTitle>
            <Package size={18} className="text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {isLoading ? "..." : Number(stats?.stockValue || 0).toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">Nilai barang di gudang</p>
          </CardContent>
        </Card>

        <Card className="dark:border-none dark:bg-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Efisiensi</CardTitle>
            <TrendingUp size={18} className="text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : (stats?.turnover || 0)}%</div>
            <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">Perputaran stok</p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BAR CHART: Tren Penjualan */}
        <Card className="md:col-span-2 dark:border-none dark:bg-slate-800">
          <CardHeader><CardTitle className="text-lg">Tren Penjualan (7 Hari)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {isLoading ? <Skeleton className="h-full w-full" /> :
                <BarChart data={stats.chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(value: number) => `${Number(value || 0).toLocaleString()}`} />
                  <Tooltip cursor={false} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '10px 14px' }}
                    // --- INI BAGIAN KUNCINYA ---
                    formatter={(value: number) => [
                      `Rp ${Number(value || 0).toLocaleString()}`,
                      "Omset"
                    ]}
                    labelStyle={{ fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}
                  />
                  <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              }
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* PIE CHART: Per Platform */}
        <Card className="dark:border-none dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Sumber Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            {isLoading ? <Skeleton className="h-full w-full" /> :
              <>
                {stats?.platforms?.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={stats.platforms}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          stroke="none"
                          dataKey="value"
                          nameKey="name"
                        >
                          {stats.platforms.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        {/* Pakai format Rp juga di sini biar seragam! */}
                        <Tooltip
                          formatter={(value: number) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                          contentStyle={{ borderRadius: '10px', border: 'none' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                      {stats.platforms.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="truncate w-20">{p.name}</span>
                          <span className="text-slate-400 dark:text-slate-500">({((p.value / stats.revenue) * 100).toFixed(0)}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  // Tampilan kalau data kosong
                  <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600">
                    <ShoppingCart size={40} className="opacity-20" />
                    <p className="text-xs italic">Belum ada data penjualan</p>
                  </div>
                )}
              </>
            }
          </CardContent>
        </Card>
      </div>

      {/* TOP PRODUCTS & STATUS STOK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP PRODUCTS */}
        <Card className="shadow-sm lg:col-span-2 dark:border-none dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold">Top 8 Produk</CardTitle>
            <TrendingUp size={18} className="text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {isLoading ? <Skeleton className="h-20 w-full mb-4" /> :
                <>
                  {stats?.topProducts && stats.topProducts.length > 0 ? (
                    stats.topProducts.map((product: any, index: number) => (
                      <div key={index} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{index + 1}.</span>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-800 truncate w-[200px] dark:text-slate-200">{product.name}</span>
                              <span className="text-[9px] text-slate-400 uppercase dark:text-slate-500">{product.sku}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{product.total_qty} <span className="text-[9px] font-normal">Pcs</span></span>
                          </div>
                        </div>
                        {/* Progress Bar Visual */}
                        <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-700">
                          <div
                            className="h-full bg-blue-500 transition-all duration-500 ease-in-out dark:bg-blue-400"
                            style={{ width: `${(product.total_qty / stats.topProducts[0].total_qty) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300 dark:text-slate-600">
                      <Box size={40} className="opacity-20 mb-2" />
                      <p className="text-[11px] italic">Belum ada data penjualan</p>
                    </div>
                  )}
                </>
              }
            </div>
          </CardContent>
        </Card>

        {/* STATUS STOK (WIDGET IMPROVED) */}
        <Card className={`shadow-md flex flex-col h-full dark:bg-slate-800 ${stats?.lowStock?.length > 0 ? "border-t-4 border-t-red-500 dark:border-t-red-400 dark:border-b-0 dark:border-l-0 dark:border-r-0 dark:shadow-none" : "border-none"}`}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold uppercase text-slate-500 tracking-wider dark:text-slate-400">Perlu Re-Stok</CardTitle>
              {!isLoading && stats?.lowStock?.length > 0 && (
                <p className="text-[10px] text-red-500 font-medium animate-pulse dark:text-red-400">
                  Ada {stats.lowStock.length} barang hampir habis!
                </p>
              )}
            </div>
            {stats?.lowStock?.length > 0 && <AlertCircle size={18} className="text-red-500 dark:text-red-400" />}
          </CardHeader>

          <CardContent className="flex-1">
            <div className="space-y-5">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : stats?.lowStock?.length > 0 ? (
                stats.lowStock.map((item: any, i: number) => {
                  // Hitung persentase untuk progress bar (asumsi ambang batas aman adalah 10)
                  const percentage = Math.min((item.quantity / 10) * 100, 100);
                  const isCritical = item.quantity <= 2;

                  return (
                    <div
                      key={i}
                      onClick={() => handleQuickAdd(item.id, item.name)}
                      className="group cursor-pointer p-2 -mx-2 rounded-xl hover:bg-blue-50 transition-all active:scale-95 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors truncate w-32 dark:text-slate-200 dark:group-hover:text-blue-400">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-black tracking-tight text-slate-400 dark:text-slate-500">
                            <span className="text-[10px] font-medium">Sisa:</span> {item.quantity} <span className="text-[10px] font-medium">Pcs</span>
                          </span>
                        </div>
                        <div className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter",
                          isCritical ? "bg-red-500 text-white shadow-sm dark:bg-red-400" : "bg-orange-100 text-orange-600 dark:bg-orange-400 dark:text-white"
                        )}>
                          {isCritical ? 'Kritis' : 'Menipis'}
                        </div>
                      </div>

                      {/* MINI PROGRESS BAR */}
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-700">
                        <div
                          className={cn(
                            "h-full transition-all duration-1000 ease-out",
                            isCritical ? "bg-red-500 dark:bg-red-400" : "bg-orange-400 dark:bg-orange-500"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mb-2 dark:bg-slate-700">
                    <CheckCircle2 size={24} className="text-green-500 dark:text-green-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-200">Gudang Aman!</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Semua stok di atas ambang batas.</p>
                </div>
              )}
            </div>
          </CardContent>

          {/* Tombol Navigasi Asli */}
          <div className="p-4 pt-0">
            <Link
              to="/shopping"
              className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold transition-all border border-dashed border-slate-200 hover:border-blue-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:border-slate-600 dark:hover:border-slate-500"
            >
              <ShoppingCart size={14} />
              Buka Daftar Belanja
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}