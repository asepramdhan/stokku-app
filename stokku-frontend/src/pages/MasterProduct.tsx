/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Box, Edit2, Filter, History, Layers, Package, Plus, Search, Trash2, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { SKULabel } from "@/components/SKULabel";
import { Scan } from "lucide-react";
import QRScanner from "../components/QRScanner";

const API_URL = `${import.meta.env.VITE_API_URL}/products`,
  API_SHOPPING = `${import.meta.env.VITE_API_URL}/shopping`; // Pastikan ini ada

type Product = {
  id?: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  avg_cost: number;
};

export default function MasterProduct() {
  // Initial State
  const [products, setProducts] = useState<Product[]>([]),
    [search, setSearch] = useState(""),
    [filterCategory, setFilterCategory] = useState("All"),
    [page, setPage] = useState(1), // State Halaman
    [pagination, setPagination] = useState<any>({ totalPages: 1, totalData: 0 }),
    [globalStats, setGlobalStats] = useState<any>({ totalItems: 0, totalStock: 0, lowStock: 0 }),
    [isAddOpen, setIsAddOpen] = useState(false),
    [newProduct, setNewProduct] = useState({ sku: "", name: "", category: "", quantity: 0, price: 0, avg_cost: 0 }),
    [isEditOpen, setIsEditOpen] = useState(false),
    [editingProduct, setEditingProduct] = useState<any>(null),
    [isLoading, setIsLoading] = useState(true),
    [errors, setErrors] = useState<{ [key: string]: string }>({}),
    [isDeleteOpen, setIsDeleteOpen] = useState(false),
    [history, setHistory] = useState<any[]>([]),
    [isHistoryOpen, setIsHistoryOpen] = useState(false),
    [historyLoading, setHistoryLoading] = useState(false),
    [isAddToShoppingOpen, setIsAddToShoppingOpen] = useState(false),
    [shoppingFormData, setShoppingFormData] = useState({ product_id: 0, name: "", qty: 1, buy_price: 0 }),
    printRef = useRef<HTMLDivElement>(null),
    [productToPrint, setProductToPrint] = useState<any>(null),
    [isScannerOpen, setIsScannerOpen] = useState(false),
    // 💡 Buat fungsi helper biar gak capek ngetik header terus
    getHeaders = () => ({
      "Authorization": `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    }),

    // Timer
    timer = 500;

  // Re-fetch data saat page, search, atau category berubah
  useEffect(() => {
    fetchProducts();
  }, [page, search, filterCategory]);

  // AMBIL DAFTAR KATEGORI UNIK DARI DATA
  const categories = ["All", ...new Set(products.map(p => p.category || "Umum"))],

    // Fungsi Filter GANDA (Search + Category)
    filtered = products.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filterCategory === "All" || (p.category || "Umum") === filterCategory;

      return matchesSearch && matchesCategory;
    }),

    // Fungsi untuk menampilkan teks error
    FieldError = ({ children }: { children: React.ReactNode }) => (
      <span className="text-[11px] font-medium text-pink-600 animate-in fade-in slide-in-from-top-1">
        {children}
      </span>
    ),

    // Fungsi Ambil Data
    fetchProducts = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}?page=${page}&search=${search}&category=${filterCategory}&limit=10`,
          { headers: getHeaders() });

        // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        const result = await res.json();

        setProducts(result.products);
        setPagination(result.pagination);
        setGlobalStats(result.stats);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },

    // Fungsi Ambil Riwayat
    fetchHistory = async (product: any) => {
      setEditingProduct(product);
      setIsHistoryOpen(true);
      setHistoryLoading(true);
      try {
        const res = await fetch(`${API_URL}/history/${product.id}`, { headers: getHeaders() });

        // Cek jika token tidak valid/expired
        if (res.status === 401) {
          localStorage.clear();
          window.location.href = "/login";
          return;
        }

        const data = await res.json();
        setHistory(data);
      } finally {
        setHistoryLoading(false);
      }
    },

    // Fungsi Tambah
    handleAdd = async () => {
      // Reset errors setiap kali tombol diklik
      const newErrors: { [key: string]: string } = {};

      // Logika Validasi
      if (!newProduct.name.trim()) newErrors.name = "Nama produk wajib diisi!";
      if (!newProduct.sku.trim()) newErrors.sku = "SKU wajib diisi!";
      if (!newProduct.category.trim()) newErrors.category = "Kategori wajib diisi!";

      // Jika ada error, set state dan batalkan kirim data
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: getHeaders(), // 💡 Pakai helper
          body: JSON.stringify(newProduct),
        });

        // Cek jika token tidak valid/expired
        if (res.status === 401) {
          localStorage.clear();
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Gagal menyimpan");
        }

        setIsAddOpen(false);
        setNewProduct({ sku: "", name: "", category: "", quantity: 0, price: 0, avg_cost: 0 });
        toast.promise<{ name: string }>(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ name: newProduct.name }), timer)
            ),
          {
            loading: "Loading...",
            success: (data) => {
              return (
                fetchProducts(),
                `Produk ${data.name} berhasil ditambahkan!`
              );
            },
            error: "Error",
          }
        )

      } catch (error: any) {
        toast.error("Waduh, terjadi kesalahan: " + error.message);
      }
    },

    // Fungsi Tambah ke Rencana Belanja
    openAddToShopping = async (product: any) => {
      try {
        // Ambil harga beli terakhir dari API Shopping yang sudah kamu punya
        const res = await fetch(`${import.meta.env.VITE_API_URL}/shopping/last-price/${product.id}`, {
          headers: getHeaders()
        });
        const data = await res.json();

        setShoppingFormData({
          product_id: product.id,
          name: product.name,
          qty: 1,
          buy_price: data.last_price || product.avg_cost || 0 // Default ke harga terakhir atau modal awal
        });
        setIsAddToShoppingOpen(true);
      } catch (error) {
        toast.error("Gagal mengambil data harga produk.");
      }
    },

    // Fungsi Update
    handleUpdate = async () => {
      // Reset errors setiap kali tombol diklik
      const newErrors: { [key: string]: string } = {};

      // Logika Validasi
      if (!editingProduct.name.trim()) newErrors.name = "Nama produk wajib diisi!";
      if (!editingProduct.sku.trim()) newErrors.sku = "SKU wajib diisi!";
      if (!editingProduct.category.trim()) newErrors.category = "Kategori wajib diisi!";

      // Jika ada error, set state dan batalkan kirim data
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/${editingProduct.id}`, {
          method: "PUT",
          headers: getHeaders(), // 💡 Pakai helper
          body: JSON.stringify(editingProduct),
        });

        // Cek jika token tidak valid/expired
        if (res.status === 401) {
          localStorage.clear();
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Gagal menyimpan");
        }

        setIsEditOpen(false);
        setEditingProduct(null);
        toast.promise<{ name: string }>(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ name: editingProduct.name }), timer)
            ),
          {
            loading: "Loading...",
            success: (data) => {
              return (
                fetchProducts(),
                `Produk ${data.name} berhasil diubah!`
              );
            },
            error: "Error",
          }
        )

      } catch (error: any) {
        toast.error("Waduh, terjadi kesalahan: " + error.message);
      }
    },

    // Fungsi Hapus
    handleDelete = async (id: number) => {
      try {
        const res = await fetch(`${API_URL}/${id}`, {
          method: "DELETE",
          headers: getHeaders() // 💡 Kuncinya di sini!
        });

        // Cek jika token tidak valid/expired
        if (res.status === 401) {
          localStorage.clear();
          window.location.href = "/login";
          return;
        }

        setIsDeleteOpen(false);

        toast.promise<{ name: string }>(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ name: editingProduct.name }), timer)
            ),
          {
            loading: "Menghapus produk...",
            success: (data) => {
              fetchProducts(); // Refresh data tabel
              return `Produk ${data.name} berhasil dihapus!`;
            },
            error: "Gagal menghapus produk",
          }
        );
      } catch (error) {
        console.error(error);
        toast.error("Terjadi kesalahan koneksi");
      }
    },

    // Fungsi Tambah ke Rencana Belanja
    handleConfirmAddToShopping = async () => {
      try {
        const res = await fetch(API_SHOPPING, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            product_id: shoppingFormData.product_id,
            qty: shoppingFormData.qty,
            buy_price: shoppingFormData.buy_price
          }),
        });

        if (res.ok) {
          setIsAddToShoppingOpen(false);
          toast.success(`${shoppingFormData.name} berhasil masuk daftar belanja!`);
        } else {
          const err = await res.json();
          toast.error(err.error || "Gagal menambahkan ke daftar belanja.");
        }
      } catch (error) {
        toast.error("Terjadi kesalahan koneksi.");
      }
    },

    // Fungsi Hitung Progress Stok
    getStockProgress = (days: number) => {
      // Kita anggap 30 hari adalah stok 100% aman
      const percentage = Math.min((days / 30) * 100, 100);

      if (days > 14) return { width: percentage, color: "bg-emerald-500 dark:bg-emerald-400", label: "Aman" };
      if (days > 7) return { width: percentage, color: "bg-blue-500 dark:bg-blue-400", label: "Cukup" };
      if (days > 3) return { width: percentage, color: "bg-orange-500 dark:bg-orange-400", label: "Menipis" };
      return { width: Math.max(percentage, 10), color: "bg-red-500 dark:bg-red-400", label: "Kritis" };
    },

    // Fungsi Cetak
    handlePrint = useReactToPrint({
      contentRef: printRef, // Ganti dari 'content: () => printRef.current' menjadi ini
      documentTitle: `Label-${productToPrint?.sku}`,
    });

  // Pemicu cetak
  useEffect(() => {
    if (productToPrint) {
      handlePrint();
      setProductToPrint(null); // Reset setelah cetak
    }
  }, [productToPrint]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Master Produk</h1>
          <p className="text-slate-500 text-sm font-medium dark:text-slate-400">
            Kelola daftar master produk di Stokku
          </p>
        </div>

        {/* Button jadi full width di mobile, balik ke auto di desktop */}
        <Button
          onClick={() => { setIsAddOpen(true); setErrors({}) }}
          className="gap-2 w-full md:w-auto shadow-md dark:shadow-none dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100"
        >
          <Plus size={18} /> Tambah Produk
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm dark:bg-slate-800 dark:border-t-0 dark:border-r-0 dark:border-b-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full dark:bg-slate-700"><Package size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Jenis Barang</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : globalStats.totalItems} Item</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm dark:bg-slate-800 dark:border-t-0 dark:border-r-0 dark:border-b-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-full dark:bg-slate-700"><Layers size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Stok (Gudang)</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : globalStats.totalStock} Pcs</h3>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 shadow-sm ${globalStats.lowStock > 0 ? "border-l-red-500 dark:border-l-red-400" : "border-l-slate-300 dark:border-l-slate-600"} dark:bg-slate-800 dark:border-t-0 dark:border-r-0 dark:border-b-0`}>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={`p-2 rounded-full ${globalStats.lowStock > 0 ? "bg-red-100 text-red-600 dark:bg-red-400 dark:text-red-100" : "bg-slate-100 text-slate-400 dark:bg-slate-700"}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Stok Menipis (&lt; 10)</p>
              <h3 className={`text-2xl font-bold ${globalStats.lowStock > 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}>
                {isLoading ? "..." : globalStats.lowStock} Item
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 bg-white border rounded-lg shadow-sm dark:bg-slate-800 dark:border-none">
          <InputGroup>
            <InputGroupInput
              placeholder="Cari berdasarkan Nama atau SKU..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} // Reset ke hal 1 saat cari
              className="dark:bg-slate-800 dark:text-slate-100"
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                variant="ghost"
                className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                onClick={() => setIsScannerOpen(true)}
              >
                <Scan size={18} />
              </InputGroupButton>
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {search &&
                <InputGroupButton
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-slate-600 transition-colors dark:text-slate-500 dark:hover:text-slate-400"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </InputGroupButton>
              }
              {filtered.length} results
            </InputGroupAddon>
          </InputGroup>
        </div>
        {/* DROPDOWN FILTER KATEGORI */}
        <div className="flex items-center gap-2 bg-white border px-3 py-1 rounded-lg shadow-sm dark:bg-slate-800 dark:border-none">
          <Filter size={14} className="text-slate-400 dark:text-slate-500" />
          <select
            className="w-full text-sm font-bold bg-transparent outline-none min-w-[140px] cursor-pointer dark:text-slate-100 dark:bg-slate-800"
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          >
            {categories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden dark:bg-slate-800 dark:border-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800 dark:text-slate-100">
              <TableRow>
                <TableHead className="w-[80px]">SKU</TableHead>
                <TableHead className="truncate w-[250px]">Nama Produk</TableHead>
                <TableHead className="w-[150px]">Kategori</TableHead>
                <TableHead className="truncate w-[150px]">Harga Jual</TableHead>
                <TableHead className="truncate w-[100px]">Stok Gudang</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Tampilkan 5 baris skeleton sebagai placeholder
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Skeleton className="h-8 w-14" />
                      <Skeleton className="h-8 w-14" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((product: any) => (
                  <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors group dark:hover:bg-slate-700">
                    <TableCell className="font-mono text-xs text-slate-500 truncate dark:text-slate-400">{product.sku || '-'}</TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">{product.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 truncate dark:text-slate-400">{product.category || 'Umum'}</TableCell>
                    <TableCell className="font-mono text-slate-500 truncate max-w-[100px] dark:text-slate-400">
                      Rp {Number(product.price).toLocaleString()}
                    </TableCell>
                    <TableCell className="w-[180px] truncate">
                      <div className="flex flex-col gap-2 py-1">
                        {/* Info Angka & Label */}
                        <div className="flex justify-between items-end">
                          <div className="flex items-baseline gap-1">
                            <span className={`text-base font-black ${product.quantity < 10 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
                              {product.quantity}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase dark:text-slate-500">Pcs</span>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${product.daysLeft > 14 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900 dark:text-emerald-400 dark:border-emerald-800' :
                            product.daysLeft > 7 ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900 dark:text-blue-400 dark:border-blue-800' :
                              'bg-red-50 text-red-600 border-red-100 dark:bg-red-900 dark:text-red-400 dark:border-red-800'
                            }`}>
                            {product.daysLeft > 90 ? "STOK AMAN" : `±${product.daysLeft} HARI`}
                          </span>
                        </div>

                        {/* Progress Bar Custom */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 dark:bg-slate-600 dark:border-none">
                          <div
                            className={`h-full transition-all duration-500 ease-in-out ${getStockProgress(product.daysLeft).color}`}
                            style={{ width: `${getStockProgress(product.daysLeft).width}%` }}
                          />
                        </div>

                        {/* Keterangan Tambahan Kecil */}
                        <p className="text-[9px] text-slate-400 font-medium italic dark:text-slate-500">
                          {product.daysLeft > 90
                            ? "Tersedia untuk > 3 bulan ke depan"
                            : `Estimasi habis pada ${new Date(Date.now() + product.daysLeft * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                          }
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {/* TOMBOL BARU: ADD TO SHOPPING */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900"
                          onClick={() => openAddToShopping(product)}
                          title="Tambah ke Daftar Belanja"
                        >
                          <Plus size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900"
                          onClick={() => fetchHistory(product)}
                        >
                          <History size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900"
                          onClick={() => { setEditingProduct(product); setIsEditOpen(true); setErrors({}) }}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                          onClick={() => setProductToPrint(product)}
                          title="Cetak Label SKU"
                        >
                          <Printer size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                          onClick={() => { setEditingProduct(product); setIsDeleteOpen(true); }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-full text-slate-300 dark:bg-slate-800">
                        {!search ?
                          <Box size={32} />
                          :
                          <Search size={32} />
                        }
                      </div>
                      <div className="space-y-1">
                        {!search ?
                          <>
                            <p className="font-medium text-slate-900 dark:text-white">Daftar Master Produk Kosong</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Coba daftarkan produk terlebih dahulu.</p>
                          </>
                          :
                          <>
                            <p className="font-medium text-slate-900 dark:text-white">Hasil pencarian tidak ditemukan</p>
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
        {/* --- UI PAGINATION (TAMBAHKAN INI) --- */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 font-medium hidden md:block dark:text-slate-400">
            Menampilkan <span className="text-slate-900 dark:text-white">{products.length}</span> dari <span className="text-slate-900">{pagination.totalData}</span> produk
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="h-8 px-3 text-xs dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-600"
            >
              Sebelumnya
            </Button>
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 h-8 w-8 flex items-center justify-center rounded-lg border border-blue-100 dark:bg-slate-800 dark:border-none dark:text-slate-400">
                {page}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">/</span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{pagination.totalPages}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="h-8 px-3 text-xs dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-600"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog Add */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle>Tambah Produk Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">SKU / Kode Barang</p>
              <Input
                value={newProduct.sku}
                className={`${errors.sku ? 'border-pink-500' : 'dark:border-slate-600'} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500 dark:bg-slate-800`}
                onChange={e => {
                  setNewProduct({ ...newProduct, sku: e.target.value });
                  if (errors.sku) setErrors({ ...errors, sku: "" });
                }
                }
                placeholder="Misal: PK-001"
              />
              {errors.sku && <FieldError>{errors.sku}</FieldError>}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Nama Produk</p>
              <Input
                value={newProduct.name}
                className={`${errors.name ? 'border-pink-500' : 'dark:border-slate-600'} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500 dark:bg-slate-800`}
                onChange={e => {
                  setNewProduct({ ...newProduct, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: "" });
                }}
                placeholder="Nama barang lengkap"
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Kategori</p>
              <Input
                value={newProduct.category}
                className={`${errors.category ? 'border-pink-500' : 'dark:border-slate-600'} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500 dark:bg-slate-800`}
                onChange={e => {
                  setNewProduct({ ...newProduct, category: e.target.value });
                  if (errors.category) setErrors({ ...errors, category: "" });
                }}
                placeholder="Pakan, Fashion, dll"
              />
              {errors.category && <FieldError>{errors.category}</FieldError>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Harga Jual</p>
                <Input
                  type="number"
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                  className="dark:bg-slate-800 dark:border-slate-600"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Stok Awal</p>
                <Input
                  type="number"
                  value={newProduct.quantity}
                  onChange={e => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })}
                  className="dark:bg-slate-800 dark:border-slate-600"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsAddOpen(false)}
              className="dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700"
            >
              Batal
            </Button>
            <Button onClick={handleAdd}>Simpan Produk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG SCANNER */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-[400px] dark:bg-slate-950 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100 italic font-black uppercase tracking-tighter flex items-center gap-2">
              <Scan size={20} className="text-blue-600" /> Scanner Stokku.id
            </DialogTitle>
          </DialogHeader>

          <QRScanner
            onScanSuccess={(sku) => {
              setSearch(sku); // Masukkan hasil scan ke kolom search
              setIsScannerOpen(false); // Tutup scanner
              setPage(1); // Reset halaman ke 1
              toast.success(`Berhasil scan SKU: ${sku}`);
            }}
            onClose={() => setIsScannerOpen(false)}
          />

          <Button variant="outline" className="w-full dark:border-slate-800 dark:text-slate-400" onClick={() => setIsScannerOpen(false)}>
            Batal
          </Button>
        </DialogContent>
      </Dialog>

      {/* DIALOG TAMBAH KE BELANJA */}
      <Dialog open={isAddToShoppingOpen} onOpenChange={setIsAddToShoppingOpen}>
        <DialogContent className="sm:max-w-[400px] dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="text-orange-500 dark:text-orange-400" size={20} />
              Masuk Daftar Belanja
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 dark:bg-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase dark:text-slate-500">Nama Produk</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{shoppingFormData.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Jumlah Beli</Label>
                <Input
                  type="number"
                  value={shoppingFormData.qty}
                  onChange={e => setShoppingFormData({ ...shoppingFormData, qty: Number(e.target.value) })}
                  className="dark:bg-slate-800 dark:border-slate-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Estimasi Harga Beli</Label>
                <Input
                  type="number"
                  value={shoppingFormData.buy_price}
                  onChange={e => setShoppingFormData({ ...shoppingFormData, buy_price: Number(e.target.value) })}
                  className="dark:bg-slate-800 dark:border-slate-600"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-dashed">
              <div className="flex justify-between items-center text-orange-700 dark:text-orange-500">
                <span className="text-[10px] font-bold uppercase">Total Estimasi</span>
                <span className="text-lg font-black">
                  Rp {(shoppingFormData.qty * shoppingFormData.buy_price).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddToShoppingOpen(false)} className="dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700">Batal</Button>
            <Button onClick={handleConfirmAddToShopping} className="bg-orange-600 hover:bg-orange-700 dark:hover:bg-orange-500">
              Tambah ke List Belanja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle>Edit Produk</DialogTitle>
          </DialogHeader>

          {editingProduct && (
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">SKU / Kode Barang</p>
                <Input
                  value={editingProduct.sku}
                  className={`${errors.sku ? 'border-pink-500' : 'dark:border-slate-600'} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500 dark:bg-slate-800`}
                  onChange={e => {
                    setEditingProduct({ ...editingProduct, sku: e.target.value });
                    if (errors.sku) setErrors({ ...errors, sku: "" })
                  }
                  }
                  placeholder="Misal: PK-001"
                />
                {errors.sku && <FieldError>{errors.sku}</FieldError>}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Nama Produk</p>
                <Input
                  value={editingProduct.name}
                  className={`${errors.name ? 'border-pink-500' : 'dark:border-slate-600'} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500 dark:bg-slate-800`}
                  onChange={e => {
                    setEditingProduct({ ...editingProduct, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" })
                  }
                  }
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Kategori</p>
                <Input
                  value={editingProduct.category}
                  className={`${errors.category ? 'border-pink-500' : 'dark:border-slate-600'} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500 dark:bg-slate-800`}
                  onChange={e => {
                    setEditingProduct({ ...editingProduct, category: e.target.value });
                    if (errors.category) setErrors({ ...errors, category: "" })
                  }}
                />
                {errors.category && <FieldError>{errors.category}</FieldError>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Harga Jual</p>
                  <Input
                    type="number"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="dark:border-slate-600"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Stok</p>
                  <Input
                    type="number"
                    value={editingProduct.quantity}
                    onChange={e => setEditingProduct({ ...editingProduct, quantity: Number(e.target.value) })}
                    className="dark:border-slate-600"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700">Batal</Button>
            <Button onClick={handleUpdate}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog History */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 border-l-0 shadow-2xl dark:bg-slate-800">
          <SheetHeader className="p-6 border-b bg-slate-50/50 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100 dark:shadow-none">
                <History size={20} />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-slate-800 truncate max-w-[200px] dark:text-white">
                  Riwayat {editingProduct?.name}
                </SheetTitle>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider dark:text-slate-500">SKU: {editingProduct?.sku}</p>
              </div>
            </div>
          </SheetHeader>

          <div className="p-6 overflow-y-auto h-[calc(100vh-100px)]">
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : history.length > 0 ? (
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent dark:before:bg-gradient-to-b dark:before:from-transparent dark:before:via-slate-700 dark:before:to-transparent">
                {history.map((log, i) => (
                  <div key={i} className="relative flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      {/* ICON STATUS */}
                      <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-110 dark:border-slate-800 ${log.type === 'MASUK' ? 'bg-emerald-500 text-white dark:bg-emerald-400' : 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                        }`}>
                        {log.type === 'MASUK' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>

                      {/* INFO TEXT */}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {log.type === 'MASUK' ? 'Stok Masuk' : 'Terjual'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-300">{log.note}</span>
                      </div>
                    </div>

                    {/* HARGA & QTY */}
                    <div className="text-right">
                      <p className={`text-sm font-black ${log.type === 'MASUK' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {log.type === 'MASUK' ? '+' : '-'}{log.qty}
                      </p>
                      <p className="text-[9px] font-medium text-slate-400 dark:text-slate-300">
                        @ Rp {Number(log.price).toLocaleString()}
                      </p>
                    </div>

                    {/* TOOLTIP WAKTU (ABSOLUTE) */}
                    <div className="absolute -top-4 left-14 text-[9px] font-bold text-slate-300 uppercase tracking-tighter dark:text-slate-400">
                      {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-300 opacity-50 dark:text-slate-400">
                <History size={48} className="mb-2" />
                <p className="text-sm italic">Belum ada riwayat pergerakan stok.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="max-w-sm dark:text-white dark:bg-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah kamu yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk <b>{editingProduct?.name}</b> akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 dark:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(editingProduct?.id)} className="dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-700 dark:bg-red-800">Ya</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Printable Area */}
      <div className="hidden">
        <SKULabel ref={printRef} product={productToPrint} />
      </div>
    </div >
  );
}