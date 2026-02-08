/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, Plus, Search, Trash2, X, ShoppingCart, Edit2, Filter, Loader2, Calendar } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const API_SHOPPING = `${import.meta.env.VITE_API_URL}/shopping`,
  API_PRODUCTS = `${import.meta.env.VITE_API_URL}/products`;

export default function Shopping() {
  const [list, setList] = useState<any[]>([]),
    [products, setProducts] = useState<any[]>([]),
    [search, setSearch] = useState(""),
    [filterStatus, setFilterStatus] = useState("All"),
    [filterCategory, setFilterCategory] = useState("All"),
    [isLoading, setIsLoading] = useState(true),
    [isAddOpen, setIsAddOpen] = useState(false),
    [newOrder, setNewOrder] = useState({ product_id: "", qty: 1, buy_price: 0 }),
    [isEditOpen, setIsEditOpen] = useState(false),
    [editingOrder, setEditingOrder] = useState<any>(null),
    [errors, setErrors] = useState<{ [key: string]: string }>({}),
    [isDeleteOpen, setIsDeleteOpen] = useState(false),
    [deleteId, setDeleteId] = useState(0),
    [productQuery, setProductQuery] = useState(""), // Kata kunci cari produk
    [suggestions, setSuggestions] = useState<any[]>([]), // Hasil saran
    [isSearching, setIsSearching] = useState(false), // Loading indikator
    [isSelected, setIsSelected] = useState(false),
    [selectedIds, setSelectedIds] = useState<number[]>([]),
    [suggestion, setSuggestion] = useState<any>(null),
    [page, setPage] = useState(1),
    [pagination, setPagination] = useState<any>({ totalPages: 1, totalData: 0 }),
    [globalStats, setGlobalStats] = useState({ pendingCount: 0, estimatedSpending: 0, totalAll: 0, totalPending: 0, totalCompleted: 0 }),

    getHeaders = () => ({
      "Authorization": `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    }),

    // Timer
    timer = 500;

  // Trigger fetch saat filter atau halaman berubah
  useEffect(() => {
    fetchData();
  }, [page, search, filterStatus, filterCategory]);

  // LOGIKA DEBOUNCE: Cari produk setelah user berhenti mengetik 500ms
  useEffect(() => {
    // JANGAN CARI jika: teks kurang dari 2, sedang loading, atau BARU SAJA PILIH BARANG
    if (productQuery.length < 2 || isSelected) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      searchProducts(productQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [productQuery, isSelected]); // Tambahkan isSelected di dependency

  // Fungsi cari produk
  const searchProducts = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/products/search-suggest?q=${query}`, { headers: getHeaders() });
      // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const data = await res.json();
      setSuggestions(data);
    } finally {
      setIsSearching(false);
    }
  },

    // Fungsi saat saran dipilih
    selectProduct = async (p: any) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/shopping/last-price/${p.id}`, { headers: getHeaders() });
      // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const priceData = await res.json();

      setIsSelected(true); // KUNCI: Tandai bahwa ini adalah hasil pilihan, bukan ngetik manual
      setNewOrder({ ...newOrder, product_id: p.id, buy_price: priceData.last_price });
      setProductQuery(p.name);
      setSuggestions([]);

      handleProductChange(p.id); // Panggil fungsi prediksi setiap kali produk dipilih
    },

    // FUNGSI UNTUK MENGAMBIL DATA
    fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Ambil data belanja dengan params
        const shopUrl = `${API_SHOPPING}?page=${page}&search=${search}&status=${filterStatus}&category=${filterCategory}&limit=10`,
          resShop = await fetch(shopUrl, { headers: getHeaders() });

        // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
        if (resShop.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        const dataShop = await resShop.json();

        setList(dataShop.list || []);
        setPagination(dataShop.pagination);
        setGlobalStats(dataShop.stats);

        // 2. Ambil produk untuk dropdown add (tetap limit besar atau gunakan search suggest)
        const resProd = await fetch(`${API_PRODUCTS}?limit=999`),
          dataProd = await resProd.json();
        setProducts(dataProd.products || []);

      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },

    // AMBIL DAFTAR KATEGORI UNIK DARI PRODUK
    categories = ["All", ...new Set(products.map(p => p.category || "Umum"))],

    // FUNGSI FILTER GANDA (Search + Status + Category)
    filtered = list.filter((item: any) => {
      const matchesSearch = item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())),
        matchesStatus = filterStatus === "All" || item.status === filterStatus,
        matchesCategory = filterCategory === "All" || (item.category || "Umum") === filterCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    }),

    // Fungsi untuk menampilkan teks error
    FieldError = ({ children }: { children: React.ReactNode }) => (
      <span className="text-[11px] font-medium text-pink-600 animate-in fade-in slide-in-from-top-1">
        {children}
      </span>
    ),

    // HANDLE ADD
    handleAdd = async () => {
      if (!newOrder.product_id) return setErrors({ product: "Cari dan Pilih produk dulu!" });
      try {
        const res = await fetch(API_SHOPPING, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(newOrder),
        });

        // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        setIsAddOpen(false);
        setErrors({}); // Bersihkan error
        toast.promise<{ name: string }>(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ name: newOrder.product_id }), timer)
            ),
          {
            loading: "Menyimpan rencana belanja...",
            success: (data) => {
              return (
                fetchData(),
                `Produk ID ${data.name} berhasil direncanakan!`
              );
            },
            error: "Gagal menyimpan rencana belanja",
          }
        )
      } catch (err: any) { toast.error(`Gagal menyimpan rencana belanja: ${err.message}`); }
    },

    // HANDLE UPDATE
    handleUpdate = async () => {
      try {
        const res = await fetch(`${API_SHOPPING}/${editingOrder.id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(editingOrder),
        });

        // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        if (!res.ok) throw new Error("Gagal update");

        setIsEditOpen(false);
        toast.promise<{ name: string }>(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ name: editingOrder.id }), timer)
            ),
          {
            loading: "Mengupdate rencana belanja...",
            success: (data) => {
              return (
                fetchData(),
                `Produk ID ${data.name} berhasil diupdate!`
              );
            },
            error: "Gagal mengupdate rencana belanja",
          }
        )
      } catch (err: any) {
        toast.error(err.message);
      }
    },

    // HANDLE DELETE
    handleDelete = async (id: number) => {
      try {
        const res = await fetch(`${API_SHOPPING}/${id}`, {
          method: "DELETE",
          headers: getHeaders()
        });

        // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        setIsDeleteOpen(false);
        setDeleteId(0);
        toast.promise<{ name: string }>(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ name: id.toString() }), timer)
            ),
          {
            loading: "Menghapus rencana belanja...",
            success: (data) => {
              return (
                fetchData(),
                `Produk ID ${data.name} berhasil dihapus!`
              );
            },
            error: "Gagal menghapus rencana belanja",
          }
        )
      } catch (err: any) {
        toast.error(`Gagal menghapus rencana belanja: ${err.message}`);
      }
    },

    // HANDLE COMPLETE
    handleComplete = async (id: number) => {
      try {
        const res = await fetch(`${API_SHOPPING}/complete/${id}`, {
          method: "POST",
          headers: getHeaders()
        });

        // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        toast.promise<{ name: string }>(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ name: id.toString() }), timer)
            ),
          {
            loading: "Mengupdate rencana belanja...",
            success: (data) => {
              return (
                fetchData(),
                `Produk ID ${data.name} berhasil diupdate!`
              );
            },
            error: "Gagal mengupdate rencana belanja",
          }
        )
      } catch (err: any) {
        toast.error(`Gagal mengupdate rencana belanja: ${err.message}`);
      }
    },

    // Fungsi Toggle Selection
    toggleSelect = (id: number) => {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    },

    // Fungsi Toggle Select All
    toggleSelectAll = () => {
      if (selectedIds.length === filtered.filter(i => i.status === 'pending').length) {
        setSelectedIds([]);
      } else {
        setSelectedIds(filtered.filter(i => i.status === 'pending').map(i => i.id));
      }
    },

    // Fungsi Bulk Complete
    handleBulkComplete = async () => {
      if (selectedIds.length === 0) return;

      toast.promise(
        fetch(`${API_SHOPPING}/complete-bulk`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ ids: selectedIds }),
        }).then(async (res) => {
          // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
          if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "/login";
            return;
          }

          if (!res.ok) throw new Error("Gagal memproses bulk");
          return res.json();
        }),
        {
          loading: `Memproses ${selectedIds.length} barang...`,
          success: () => {
            fetchData();
            setSelectedIds([]);
            return "Semua barang berhasil masuk gudang!";
          },
          error: "Terjadi kesalahan",
        }
      );
    },

    // Saat produk dipilih, cari saran tanggalnya
    handleProductChange = async (pId: string) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/products/restock-suggestions`, { headers: getHeaders() });
      // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const allSuggestions = await res.json(),
        found = allSuggestions.find((s: any) => s.id === Number(pId));
      setSuggestion(found);
    };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Belanja</h1>
          <p className="text-slate-500 text-sm font-medium">Rencanakan kulakan barang dan update stok otomatis.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2 w-full md:w-auto shadow-md">
          <Plus size={18} /> Buat Rencana Belanja
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-full"><Clock size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Rencana Menunggu</p>
              <h3 className="text-xl font-bold">{globalStats.pendingCount} Transaksi</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><ShoppingCart size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Estimasi Biaya Belanja</p>
              <h3 className="text-xl font-bold">Rp {Number(globalStats.estimatedSpending).toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center">
        <div className="flex-1 w-full bg-white border rounded-xl shadow-sm overflow-hidden">
          <InputGroup>
            <InputGroupInput
              placeholder="Cari barang belanjaan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none focus-visible:ring-0"
            />
            <InputGroupAddon><Search size={18} className="text-slate-400" /></InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {search && <InputGroupButton variant="ghost" onClick={() => setSearch("")}><X size={16} /></InputGroupButton>}
              {filtered.length} results
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* --- SMART STATUS FILTER (SINKRON DENGAN BACKEND) --- */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full lg:w-auto">
          {[
            {
              id: "All",
              label: "Semua",
              color: "bg-slate-500 text-white shadow-md",
              count: globalStats.totalAll // ✅ Ambil total dari seluruh DB
            },
            {
              id: "pending",
              label: "Pending",
              color: "bg-orange-500 text-white shadow-md",
              count: globalStats.totalPending // ✅ Ambil total pending dari seluruh DB
            },
            {
              id: "completed",
              label: "Selesai",
              color: "bg-green-600 text-white shadow-md",
              count: globalStats.totalCompleted // ✅ Ambil total selesai dari seluruh DB
            },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterStatus(tab.id);
                  setPage(1); // 💡 PENTING: Reset ke halaman 1 setiap ganti filter!
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex-1 lg:flex-none justify-center ${isActive ? tab.color : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* FILTER KATEGORI (Tetap Dropdown atau bisa disesuaikan) */}
        <div className="flex items-center gap-2 bg-white border px-3 py-2 rounded-xl shadow-sm w-full lg:w-auto">
          <Filter size={14} className="text-slate-400" />
          <select
            className="w-full text-xs font-bold bg-transparent outline-none min-w-[100px] cursor-pointer"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- ACTION BAR (Muncul saat ada yang dicentang) --- */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-bold">{selectedIds.length} barang dipilih</span>
          <div className="h-4 w-[1px] bg-white/20" />
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 h-8 font-bold"
            onClick={handleBulkComplete}
          >
            Terima Semua
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 h-8"
            onClick={() => setSelectedIds([])}
          >
            Batal
          </Button>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={selectedIds.length > 0 && selectedIds.length === filtered.filter(i => i.status === 'pending').length}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold w-[250px]">Produk</TableHead>
                <TableHead className="font-semibold w-[80px]">Qty</TableHead>
                <TableHead className="font-semibold w-[100px] truncate">Harga Beli</TableHead>
                <TableHead className="font-semibold w-[100px]">Waktu</TableHead> {/* Kolom Baru */}
                <TableHead className="font-semibold w-[100px]">Status</TableHead>
                <TableHead className="text-right font-semibold w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : list.length > 0 ? (
                list.map((item: any) => (
                  // "hover:bg-slate-50/50 transition-colors group"
                  <TableRow key={item.id} className={selectedIds.includes(item.id) ? "bg-blue-50/50" : ""}>
                    <TableCell>
                      {item.status === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-slate-300"
                        />
                      )}
                    </TableCell>
                    <TableCell className="truncate max-w-[200px]">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{item.category || 'Umum'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-black tracking-tight truncate w-[100px]">
                      {item.qty} <span className="text-[10px] font-medium text-slate-400">Pcs</span>
                    </TableCell>
                    <TableCell className="truncate">Rp {Number(item.buy_price).toLocaleString()}</TableCell>

                    {/* KOLOM WAKTU */}
                    <TableCell className="text-xs text-slate-500 truncate">
                      {new Date(item.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>

                    <TableCell className="truncate">
                      {item.status === 'pending' ? (
                        <Badge variant="outline" className="text-orange-500 bg-orange-50 border-orange-200 gap-1 font-medium">
                          <Clock size={12} /> Pending
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 gap-1 font-medium shadow-sm">
                          <CheckCircle2 size={12} /> Selesai
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {item.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 h-8 px-3"
                              onClick={() => handleComplete(item.id)}
                            >
                              Terima
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-blue-600"
                              onClick={() => {
                                setEditingOrder(item);
                                setIsEditOpen(true);
                              }}
                            >
                              <Edit2 size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => {
                                setIsDeleteOpen(true);
                                setDeleteId(item.id);
                              }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center py-10">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ShoppingCart size={40} className="opacity-20" />
                      <p>Belum ada rencana belanja.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* UI PAGINATION */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium hidden md:block">
            Menampilkan <span className="text-slate-900">{list.length}</span> dari <span className="text-slate-900">{pagination.totalData}</span> rencana
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="h-8 px-3 text-xs"
            >
              Sebelumnya
            </Button>
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 h-8 w-8 flex items-center justify-center rounded-lg border border-blue-100">
                {page}
              </span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xs font-medium text-slate-600">{pagination.totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="h-8 px-3 text-xs"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOG ADD */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) setSuggestion(null); // Reset saran saat dialog ditutup
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rencana Belanja Baru</DialogTitle></DialogHeader>
          {/* --- KARTU PREDIKSI TANGGAL BELANJA --- */}
          {suggestion && (
            <div className={`p-4 rounded-xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${suggestion.isUrgent ? "bg-red-50 border-red-100 shadow-sm" : "bg-blue-50 border-blue-100"
              }`}>
              <div className={`p-2 rounded-lg ${suggestion.isUrgent ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                <Calendar size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Saran Tanggal Belanja</p>
                <p className={`text-sm font-black ${suggestion.isUrgent ? "text-red-600" : "text-blue-600"}`}>
                  {new Date(suggestion.suggestedDate).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  Estimasi stok habis dalam <span className="font-bold text-slate-600">{suggestion.daysLeft} hari</span>
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            {/* SEARCH INPUT FIELD */}
            <div className="space-y-1 relative">
              <p className="text-[10px] font-bold uppercase text-slate-500">Cari Produk</p>
              <div className="relative">
                <Input
                  placeholder="Ketik nama atau SKU..."
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    setIsSelected(false); // BUKA KUNCI: Jika user ngetik lagi, berarti dia mau cari ulang
                  }}
                  className={`pr-10 w-full border p-2 rounded-md text-sm ${errors.product ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
                />
                {errors.product && <FieldError>{errors.product}</FieldError>}
                <div className="absolute right-3 top-2.5 text-slate-400">
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </div>
              </div>

              {/* DROPDOWN SARAN (Muncul jika ada hasil) */}
              {suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-200">
                  {suggestions.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => selectProduct(p)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{p.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{p.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">Stok: {p.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Jumlah Beli</p>
                <Input
                  type="number"
                  value={newOrder.qty}
                  onChange={e => setNewOrder({ ...newOrder, qty: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Harga Beli Satuan</p>
                <Input
                  type="number"
                  value={newOrder.buy_price}
                  onChange={e => setNewOrder({ ...newOrder, buy_price: Number(e.target.value) })}
                />
              </div>
            </div>
            {/* --- INI BAGIAN TOTALNYA --- */}
            <div className="pt-2 border-t border-dashed">
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Estimasi Total</span>
                <span className="text-lg font-black text-blue-700">
                  Rp {(newOrder.qty * newOrder.buy_price).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={handleAdd}>Simpan Rencana</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG EDIT */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rencana Belanja</DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Nama Produk</p>
                <Input value={editingOrder.product_name} disabled className="bg-slate-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Jumlah Beli</p>
                  <Input
                    type="number"
                    value={editingOrder.qty}
                    onChange={e => setEditingOrder({ ...editingOrder, qty: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Harga Beli Satuan</p>
                  <Input
                    type="number"
                    value={editingOrder.buy_price}
                    onChange={e => setEditingOrder({ ...editingOrder, buy_price: Number(e.target.value) })}
                  />
                </div>
              </div>
              {/* --- INI BAGIAN TOTALNYA --- */}
              <div className="pt-2 border-t border-dashed">
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Estimasi Total</span>
                  <span className="text-lg font-black text-blue-700">
                    Rp {(editingOrder.qty * editingOrder.buy_price).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleUpdate}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah kamu yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Rencana belanja <b>{filtered.find(item => item.id === deleteId)?.product_name}</b> akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteId)}>Ya</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}