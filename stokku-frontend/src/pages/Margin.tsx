/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Wallet, Receipt, Search, X, Info, Filter, Calendar, Pencil, Banknote } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useTitle } from "@/hooks/useTitle";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

const API_MARGIN = `${import.meta.env.VITE_API_URL}/margin`,
  API_STORES = `${import.meta.env.VITE_API_URL}/stores`,
  API_ADS = `${import.meta.env.VITE_API_URL}/margin/ads`;

export default function Margin() {
  useTitle("Analisa Margin");
  const [data, setData] = useState<any[]>([]),
    [stores, setStores] = useState<any[]>([]),
    [search, setSearch] = useState(localStorage.getItem("mg_search") || ""),
    [range, setRange] = useState(localStorage.getItem("mg_range") || "all"),
    [filterStore, setFilterStore] = useState(localStorage.getItem("mg_store") || "All"),
    [page, setPage] = useState(Number(localStorage.getItem("mg_page")) || 1),
    [pagination, setPagination] = useState<any>({ totalPages: 1, totalData: 0 }),
    [globalStats, setGlobalStats] = useState({ totalRevenue: 0, totalNetProfit: 0, avgMargin: 0, totalCost: 0 }),
    [topProducts, setTopProducts] = useState<any[]>([]),
    [isLoading, setIsLoading] = useState(true),
    [isAdOpen, setIsAdOpen] = useState(false),
    [newAd, setNewAd] = useState({ store_id: "", amount: "", date: new Date().toISOString().split('T')[0], note: "" }),
    [isSubmitting, setIsSubmitting] = useState(false),
    [adsList, setAdsList] = useState<any[]>([]),
    [isEditOpen, setIsEditOpen] = useState(false),
    [editingAd, setEditingAd] = useState<any>(null),
    [adPage, setAdPage] = useState(Number(localStorage.getItem("mg_ad_page")) || 1),
    [adPagination, setAdPagination] = useState({ totalPages: 1, totalData: 0 }),
    [totalAllAds, setTotalAllAds] = useState(0);

  // Re-fetch data jika range tanggal berubah
  useEffect(() => { fetchMargin(); }, [page, range, search, filterStore]);

  // Simpan filter margin ke localStorage setiap ada perubahan
  useEffect(() => {
    localStorage.setItem("mg_search", search);
    localStorage.setItem("mg_range", range);
    localStorage.setItem("mg_store", filterStore);
    localStorage.setItem("mg_page", page.toString());
    localStorage.setItem("mg_ad_page", adPage.toString());
  }, [search, range, filterStore, page, adPage]);

  // Re-fetch ads
  useEffect(() => { fetchAds(); }, [adPage]);

  // Fungsi fetch margin
  const fetchMargin = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token"),
        headers = {
          "Authorization": `Bearer ${token}`, // Tiket masuk
          "Accept": "application/json",
        },
        url = `${API_MARGIN}?page=${page}&range=${range}&search=${search}&store=${filterStore}&limit=10`,
        [resMargin, resStore] = await Promise.all([
          fetch(url, { headers }),
          fetch(API_STORES, { headers }),
        ]);

      // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
      if (resMargin.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const resData = await resMargin.json(),
        storeData = await resStore.json();

      setData(resData.list || []);
      setTopProducts(resData.topProducts || []);
      setPagination(resData.pagination);
      setGlobalStats(resData.stats);
      setStores(storeData.stores || (Array.isArray(storeData) ? storeData : []));
      fetchAds();
    } finally {
      setIsLoading(false);
    }
  },

    // Fungsi fetch ads
    fetchAds = async () => {
      try {
        const res = await fetch(`${API_ADS.replace('/ads', '/ads-list')}?page=${adPage}&range=${range}&store=${filterStore}`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const resData = await res.json();
        setAdsList(resData.list || []);
        setAdPagination({ totalPages: resData.totalPages, totalData: resData.totalData });
        // Gunakan fungsi yang Anda minta:
        setTotalAllAds(resData.totalAmount);
      } catch (e) { console.error(e); }
    },

    // LOGIKA PERHITUNGAN
    calculateFees = (item: any) => {
      const admin = (item.total_price * item.admin_fee) / 100;
      const extra = (item.total_price * item.extra_promo_fee) / 100;
      return admin + extra + Number(item.handling_fee);
    },

    // Fungsi Perhitungan Profit
    calculateProfit = (item: any) => {
      const totalCapital = item.qty * item.capital;
      return item.total_price - totalCapital - calculateFees(item);
    },

    // 3. Fungsi Simpan Iklan
    handleAddAd = async () => {
      if (!newAd.store_id || !newAd.amount) return alert("Pilih toko dan isi nominal!");
      setIsSubmitting(true);
      try {
        const res = await fetch(API_ADS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAd),
        });
        if (res.ok) {
          setIsAdOpen(false);
          setNewAd({ store_id: "", amount: "", date: new Date().toISOString().split('T')[0], note: "" });
          fetchMargin(); // Refresh data
        }
      } finally {
        setIsSubmitting(false);
      }
    },

    handleUpdateAd = async () => {
      if (!editingAd.store_id || !editingAd.amount) return alert("Pilih toko dan isi nominal!");
      setIsSubmitting(true);
      try {
        const res = await fetch(`${API_ADS}/${editingAd.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(editingAd),
        });
        if (res.ok) {
          setIsEditOpen(false);
          fetchMargin(); // Refresh data biar profit & tabel update
        }
      } finally {
        setIsSubmitting(false);
      }
    },

    // 4. Fungsi Hapus Iklan
    handleDeleteAd = async (id: number) => {
      if (!window.confirm("Yakin mau hapus data iklan ini?")) return;
      try {
        const res = await fetch(`${API_ADS}/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
          fetchMargin(); // Refresh semua data biar profit balik normal
        }
      } catch (e) { console.error(e); }
    },

    // Fungsi Helper Penyelamat Filter
    handleSearch = (val: string) => { setSearch(val); setPage(1); },
    handleStoreFilter = (val: string) => { setFilterStore(val); setPage(1); },
    handleRangeFilter = (val: string) => { setRange(val); setPage(1); };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analisa Margin</h1>
          <p className="text-slate-500 text-sm font-medium dark:text-slate-400">
            Pantau keuntungan bersih setelah dipotong biaya operasional.
          </p>
        </div>

        {/* TOMBOL: Ditambah w-full biar lebar di HP, md:w-auto biar normal di laptop */}
        <div className="flex w-full md:w-auto gap-2">
          <Dialog open={isAdOpen} onOpenChange={setIsAdOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full md:w-auto gap-2 border-dashed border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-700"
              >
                <TrendingUp size={16} /> Input Biaya Iklan / Lainnya
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
              <AlertDialogHeader>
                <DialogTitle>Catat Biaya Iklan (Ads)</DialogTitle>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Pilih Toko</label>
                  <select
                    className="w-full border p-2 rounded-md text-sm dark:bg-slate-700 dark:border-slate-600"
                    value={newAd.store_id}
                    onChange={(e) => setNewAd({ ...newAd, store_id: e.target.value })}
                  >
                    <option value="">-- Pilih Toko --</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Tanggal</label>
                    <Input
                      type="date"
                      value={newAd.date}
                      onChange={(e) => setNewAd({ ...newAd, date: e.target.value })}
                      className="w-full block text-left dark:bg-slate-700 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Nominal (Rp)</label>
                    <Input type="number" value={newAd.amount} onChange={(e) => setNewAd({ ...newAd, amount: e.target.value })} placeholder="0" className="dark:bg-slate-700" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Catatan (Optional)</label>
                  <Input value={newAd.note} onChange={(e) => setNewAd({ ...newAd, note: e.target.value })} placeholder="Contoh: Iklan Flash Sale" className="dark:bg-slate-700" />
                </div>
              </div>
              <DialogFooter className="flex flex-col-reverse gap-2 md:gap-0 md:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setIsAdOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAddAd}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Biaya"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm dark:bg-slate-800 dark:border-t-0 dark:border-r-0 dark:border-b-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full dark:bg-slate-700">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Omset (Bruto)</p>
              <h3 className="text-xl font-bold">
                {Number(globalStats.totalRevenue).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* FIXED: Modal Produk */}
        <Card className="border-l-4 border-l-orange-500 shadow-sm dark:bg-slate-800 dark:border-t-0 dark:border-r-0 dark:border-b-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-full dark:bg-slate-700">
              <Banknote size={20} /> {/* Menggunakan Receipt karena ReceiptCent sering tidak tersedia di versi standar */}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Modal Produk</p>
              <h3 className="text-xl font-bold">
                {Number(globalStats.totalCost || 0).toLocaleString('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0
                })}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Card Total Biaya Iklan (Sesuai yang sudah jalan di kode Anda) */}
        <Card className="border-l-4 border-l-slate-500 shadow-sm dark:bg-slate-800 dark:border-t-0 dark:border-r-0 dark:border-b-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-full dark:bg-slate-700"><Receipt size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Biaya Iklan / Lainnya</p>
              <h3 className="text-xl font-bold">
                {Number(totalAllAds).toLocaleString('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0
                })}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Card Profit Bersih */}
        <Card className={`border-l-4 shadow-sm transition-all duration-300 dark:bg-slate-800 dark:border-t-0 dark:border-r-0 dark:border-b-0 ${globalStats.totalNetProfit < 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={`p-2 rounded-full ${globalStats.totalNetProfit < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} dark:bg-slate-700`}>
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Profit Bersih (Netto)</p>
              <h3 className={`text-xl font-bold ${globalStats.totalNetProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Number(globalStats.totalNetProfit).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Card Persentase */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm dark:bg-slate-800 dark:border-t-0 dark:border-r-0 dark:border-b-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-full dark:bg-slate-700"><TrendingUp size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Persentase Margin</p>
              <h3 className="text-xl font-bold">{globalStats.avgMargin.toFixed(1)}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TOP 3 BARANG PALING CUAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : topProducts.map((p, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white dark:bg-slate-800 dark:border-t-0 dark:border-r-0 dark:border-b-0 dark:from-slate-700 dark:to-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-[10px] font-black dark:bg-slate-700">
                    #{i + 1}
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Produk Ter-Cuan</p>
                </div>
                <h4 className="font-bold text-sm truncate max-w-[150px]">{p.product_name}</h4>
                <p className="text-xl font-black">Rp {Number(p.total_net_profit).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl rotate-12 group-hover:rotate-0 transition-transform dark:bg-slate-700">
                <TrendingUp size={32} className="opacity-50" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 bg-white border rounded-lg shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <InputGroup>
            <InputGroupInput placeholder="Cari transaksi..." value={search} onChange={(e) => handleSearch(e.target.value)} className="dark:bg-slate-800" />
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {search && <InputGroupButton variant="ghost" onClick={() => handleSearch("")} className="dark:bg-slate-800"><X size={16} /></InputGroupButton>}
              {data.length} results
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex flex-row gap-2">
          {/* FILTER WAKTU */}
          <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <Calendar size={14} className="text-slate-400 dark:text-slate-300" />
            <select className="w-full text-xs font-bold bg-transparent outline-none cursor-pointer dark:text-slate-300 dark:bg-slate-800" value={range} onChange={(e) => handleRangeFilter(e.target.value)}>
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="yesterday">Hari Kemarin</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>

          {/* FILTER TOKO */}
          <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <Filter size={14} className="text-slate-400 dark:text-slate-300" />
            <select className="w-full text-xs font-bold bg-transparent outline-none min-w-[100px] cursor-pointer dark:text-slate-300 dark:bg-slate-800" value={filterStore} onChange={(e) => handleStoreFilter(e.target.value)}>
              <option value="All">Semua Toko</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800">
              <TableRow>
                <TableHead className="truncate w-[100px]">Produk & Toko</TableHead>
                <TableHead className="truncate w-[100px]">Modal vs Jual</TableHead>
                <TableHead className="truncate w-[100px]">Biaya Admin</TableHead>
                <TableHead className="text-right truncate w-[100px]">Profit Bersih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data.length > 0 ? (
                data.map((item: any) => {
                  const profit = calculateProfit(item), fees = calculateFees(item);
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors dark:hover:bg-slate-700">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 truncate dark:text-white">{item.product_name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.store_name} ({item.platform})</span>
                        </div>
                      </TableCell>
                      <TableCell className="truncate w-[100px]">
                        <div className="text-xs">
                          <p className="text-slate-400 italic text-[10px] dark:text-slate-500">C: Rp {Number(item.qty * item.capital).toLocaleString()}</p>
                          <p className="font-semibold">S: Rp {Number(item.total_price).toLocaleString()}</p>
                        </div>
                      </TableCell>
                      <TableCell className="truncate w-[100px]">
                        <div className="flex items-center gap-1 text-red-500 font-medium text-xs dark:text-red-400">
                          -Rp {Number(fees).toLocaleString()}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger><Info size={12} className="text-slate-300 dark:text-slate-400" /></TooltipTrigger>
                              <TooltipContent className="text-[10px] dark:text-slate-300 dark:bg-slate-700 dark:shadow-md">
                                Adm: {Number(item.admin_fee)}% | Ext: {Number(item.extra_promo_fee)}% | Proc: Rp {Number(item.handling_fee).toLocaleString()}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="text-right truncate w-[120px]">
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={profit > 0 ? "bg-green-500 dark:bg-green-400" : "bg-red-500 dark:bg-red-400"}>
                            Rp {Number(profit).toLocaleString()}
                          </Badge>

                          {/* INFO IKLAN (Hanya muncul jika ada info iklan di stats atau data) */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[9px] text-slate-400 cursor-help hover:text-orange-500 transition-colors flex items-center gap-1">
                                  <TrendingUp size={10} /> Estimasi Netto
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="dark:bg-slate-700">
                                <p className="text-[10px] dark:text-slate-300">
                                  Profit di atas belum dipotong biaya iklan toko harian.<br />
                                  Cek "Profit Bersih (Netto)" di kartu atas untuk hasil akhir.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-full text-slate-300 dark:bg-slate-700">
                        {!search ?
                          <TrendingUp size={32} />
                          :
                          <Search size={32} />
                        }
                      </div>
                      <div className="space-y-1">
                        {!search ?
                          <>
                            <p className="font-medium text-slate-900 dark:text-white">Data masih kosong</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Coba buat transaksi baru, dihalaman penjualan</p>
                          </>
                          :
                          <>
                            <p className="font-medium text-slate-900 dark:text-white">Data tidak ditemukan</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Coba gunakan kata kunci pencarian lain.</p>
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
        {/* PAGINATION CONTROLS */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total <span className="font-semibold dark:text-blue-400">{pagination.totalData}</span> transaksi</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 dark:border-slate-700 dark:bg-slate-700">Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage(page + 1)} className="dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 dark:border-slate-700 dark:bg-slate-700">Selanjutnya</Button>
          </div>
        </div>
      </div>

      {/* TABEL RIWAYAT IKLAN TERBARU - VERSI ANTI MELEBER */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-500" /> Riwayat Iklan Terakhir
          </h3>
          <div className="flex gap-2">
            {/* Info tambahan biar user gak bingung */}
            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
              Menampilkan {adsList.length} data terbaru
            </span>
            {/* Info tambahan lain menampilkan total biaya keseluruhan berdasarkan filter */}
            <span className="text-[10px] text-orange-600 bg-orange-50 dark:bg-slate-700 dark:text-orange-400 px-2 py-1 rounded font-bold border border-orange-100 dark:border-slate-600">
              Total Biaya Iklan / Lainnya :
              <span className="ml-1 font-bold dark:text-white">
                {Number(totalAllAds).toLocaleString('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0
                })}
              </span>
            </span>
          </div>
        </div>

        <div className="bg-white border rounded-lg shadow-sm dark:bg-slate-800 dark:border-slate-700">
          {/* KUNCINYA: Tambahkan div pembungkus dengan max-h-80 dan overflow-auto */}
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
                <TableRow>
                  <TableHead>Toko</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Biaya</TableHead>
                  <TableHead className="w-[80px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adsList.length > 0 ? adsList.map((ad) => (
                  <TableRow key={ad.id} className="dark:hover:bg-slate-700">
                    <TableCell className="font-medium">{ad.store_name}</TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(ad.date).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="text-xs italic text-slate-400 max-w-[200px] truncate">
                      {ad.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-600 whitespace-nowrap">
                      -Rp {Number(ad.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingAd(ad); setIsEditOpen(true); }} className="h-7 w-7 text-blue-500"><Pencil size={12} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAd(ad.id)} className="h-7 w-7 text-red-500"><X size={12} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 italic">Belum ada data iklan yang tercatat.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {/* PAGINATION RIWAYAT IKLAN */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 dark:bg-slate-800 rounded-b-lg">
              <p className="text-[10px] text-slate-500">
                Total <span className="font-bold">{adPagination.totalData}</span> iklan tercatat
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={adPage === 1}
                  onClick={() => setAdPage(adPage - 1)}
                  className="h-7 text-[10px] dark:bg-slate-700"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={adPage === adPagination.totalPages}
                  onClick={() => setAdPage(adPage + 1)}
                  className="h-7 text-[10px] dark:bg-slate-700"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle>Edit Biaya Iklan</DialogTitle>
          </DialogHeader>
          {editingAd && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Pilih Toko</label>
                <select
                  className="w-full border p-2 rounded-md text-sm dark:bg-slate-700 dark:border-slate-600"
                  value={editingAd.store_id}
                  onChange={(e) => setEditingAd({ ...editingAd, store_id: e.target.value })}
                >
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Nominal (Rp)</label>
                  <Input type="number" value={editingAd.amount} onChange={(e) => setEditingAd({ ...editingAd, amount: e.target.value })} className="dark:bg-slate-700" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Tanggal</label>
                  <Input
                    type="date"
                    value={editingAd.date?.split('T')[0]}
                    onChange={(e) => setEditingAd({ ...editingAd, date: e.target.value })}
                    className="w-full block text-left dark:bg-slate-700 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Catatan</label>
                <Input value={editingAd.notes} onChange={(e) => setEditingAd({ ...editingAd, notes: e.target.value })} className="dark:bg-slate-700" />
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse gap-2 md:gap-0 md:flex-row">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button onClick={handleUpdateAd} disabled={isSubmitting} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? "Menyimpan..." : "Update Biaya"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}