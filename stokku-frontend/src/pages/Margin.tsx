/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Wallet, Receipt, Search, X, Info, Filter, Calendar } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const API_MARGIN = `${import.meta.env.VITE_API_URL}/margin`,
  API_STORES = `${import.meta.env.VITE_API_URL}/stores`;

export default function Margin() {
  const [data, setData] = useState<any[]>([]),
    [stores, setStores] = useState<any[]>([]),
    [search, setSearch] = useState(""),
    [range, setRange] = useState("all"),
    [filterStore, setFilterStore] = useState("All"),
    [isLoading, setIsLoading] = useState(true);

  // Re-fetch data jika range tanggal berubah
  useEffect(() => { fetchMargin(); }, [range]);

  const fetchMargin = async () => {
    setIsLoading(true);
    try {
      const [resMargin, resStore] = await Promise.all([
        fetch(`${API_MARGIN}?range=${range}`),
        fetch(API_STORES)
      ]);
      setData(await resMargin.json());
      setStores(await resStore.json());
    } finally {
      setIsLoading(false);
    }
  },

    // LOGIKA PERHITUNGAN
    calculateFees = (item: any) => {
      const admin = (item.total_price * item.admin_fee) / 100;
      const extra = (item.total_price * item.extra_promo_fee) / 100;
      return admin + extra + Number(item.handling_fee);
    },

    calculateProfit = (item: any) => {
      const totalCapital = item.qty * item.capital;
      return item.total_price - totalCapital - calculateFees(item);
    },

    // LOGIKA FILTER GANDA (Search + Toko)
    filtered = data.filter((s: any) => {
      const matchesSearch = s.product_name.toLowerCase().includes(search.toLowerCase()) ||
        s.store_name.toLowerCase().includes(search.toLowerCase()),
        matchesStore = filterStore === "All" || s.store_name === filterStore;
      return matchesSearch && matchesStore;
    }),

    // STATISTIK KESELURUHAN (Dihitung dari data yang sudah difilter)
    totalRevenue = filtered.reduce((acc, curr) => acc + Number(curr.total_price), 0),
    totalNetProfit = filtered.reduce((acc, curr) => acc + calculateProfit(curr), 0),
    avgMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analisa Margin</h1>
          <p className="text-slate-500 text-sm font-medium">Pantau keuntungan bersih setelah dipotong biaya operasional.</p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Receipt size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Omset (Bruto)</p>
              <h3 className="text-xl font-bold">Rp {totalRevenue.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-full"><Wallet size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Profit Bersih (Netto)</p>
              <h3 className="text-xl font-bold text-green-600">Rp {totalNetProfit.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><TrendingUp size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Persentase Margin</p>
              <h3 className="text-xl font-bold">{avgMargin.toFixed(1)}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 bg-white border rounded-lg shadow-sm">
          <InputGroup>
            <InputGroupInput placeholder="Cari transaksi..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {search && <InputGroupButton variant="ghost" onClick={() => setSearch("")}><X size={16} /></InputGroupButton>}
              {filtered.length} results
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex flex-row gap-2">
          {/* FILTER WAKTU */}
          <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <select className="w-full text-xs font-bold bg-transparent outline-none cursor-pointer" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>

          {/* FILTER TOKO */}
          <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select className="w-full text-xs font-bold bg-transparent outline-none min-w-[100px] cursor-pointer" value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
              <option value="All">Semua Toko</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="truncate">Produk & Toko</TableHead>
                <TableHead className="truncate">Modal vs Jual</TableHead>
                <TableHead className="truncate">Biaya Admin</TableHead>
                <TableHead className="text-right truncate">Profit Bersih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((item: any) => {
                  const profit = calculateProfit(item), fees = calculateFees(item);
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 truncate max-w-[150px]">{item.product_name}</span>
                          <span className="text-[10px] text-slate-400 truncate">{item.store_name} ({item.platform})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="text-slate-400 italic text-[10px] truncate">C: Rp {(item.qty * item.capital).toLocaleString()}</p>
                          <p className="font-semibold truncate">S: Rp {Number(item.total_price).toLocaleString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-red-500 font-medium text-xs truncate">
                          -Rp {fees.toLocaleString()}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger><Info size={12} className="text-slate-300" /></TooltipTrigger>
                              <TooltipContent className="text-[10px]">
                                Adm: {item.admin_fee}% | Ext: {item.extra_promo_fee}% | Proc: Rp {Number(item.handling_fee).toLocaleString()}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="text-right truncate">
                        <Badge className={profit > 0 ? "bg-green-500" : "bg-red-500"}>
                          Rp {profit.toLocaleString()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-full text-slate-300">
                        {!search ?
                          <TrendingUp size={32} />
                          :
                          <Search size={32} />
                        }
                      </div>
                      <div className="space-y-1">
                        {!search ?
                          <>
                            <p className="font-medium text-slate-900">Data masih kosong</p>
                            <p className="text-sm text-slate-500">Coba buat transaksi baru, dihalaman penjualan</p>
                          </>
                          :
                          <>
                            <p className="font-medium text-slate-900">Data tidak ditemukan</p>
                            <p className="text-sm text-slate-500">Coba gunakan kata kunci pencarian lain.</p>
                          </>
                        }
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}