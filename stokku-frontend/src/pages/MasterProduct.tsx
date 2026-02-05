/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
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

const API_URL = `${import.meta.env.VITE_API_URL}/products`;

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
    // 💡 Buat fungsi helper biar gak capek ngetik header terus
    getHeaders = () => ({
      "Authorization": `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    }),

    // Timer
    timer = 1000;

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
    };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Master Produk</h1>
          <p className="text-slate-500 text-sm font-medium">
            Kelola daftar master produk di Stokku
          </p>
        </div>

        {/* Button jadi full width di mobile, balik ke auto di desktop */}
        <Button
          onClick={() => { setIsAddOpen(true); setErrors({}) }}
          className="gap-2 w-full md:w-auto shadow-md"
        >
          <Plus size={18} /> Tambah Produk
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Package size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Jenis Barang</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : globalStats.totalItems} Item</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-full"><Layers size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Stok (Gudang)</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : globalStats.totalStock} Pcs</h3>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 shadow-sm ${globalStats.lowStock > 0 ? "border-l-red-500" : "border-l-slate-300"}`}>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={`p-2 rounded-full ${globalStats.lowStock > 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Stok Menipis (&lt; 10)</p>
              <h3 className={`text-2xl font-bold ${globalStats.lowStock > 0 ? "text-red-600" : "text-slate-600"}`}>
                {isLoading ? "..." : globalStats.lowStock} Item
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 bg-white border rounded-lg shadow-sm">
          <InputGroup>
            <InputGroupInput
              placeholder="Cari berdasarkan Nama atau SKU..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} // Reset ke hal 1 saat cari
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {search &&
                <InputGroupButton
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-slate-600 transition-colors"
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
        <div className="flex items-center gap-2 bg-white border px-3 py-1 rounded-lg shadow-sm">
          <Filter size={14} className="text-slate-400" />
          <select
            className="w-full text-sm font-bold bg-transparent outline-none min-w-[140px] cursor-pointer"
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
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
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
                  <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="font-mono text-xs text-slate-500 truncate">{product.sku || '-'}</TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">{product.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 truncate">{product.category || 'Umum'}</TableCell>
                    <TableCell className="font-mono text-slate-500 truncate max-w-[100px]">
                      Rp {Number(product.price).toLocaleString()}
                    </TableCell>
                    <TableCell className="truncate">
                      <div className="flex flex-col gap-1">
                        <span className={`font-bold ${product.quantity < 10 ? 'text-red-500' : 'text-slate-700'}`}>
                          {product.quantity}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Habis dlm ±{product.daysLeft} hari
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => fetchHistory(product)}
                        >
                          <History size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => { setEditingProduct(product); setIsEditOpen(true); setErrors({}) }}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                      <div className="p-3 bg-slate-50 rounded-full text-slate-300">
                        {!search ?
                          <Box size={32} />
                          :
                          <Search size={32} />
                        }
                      </div>
                      <div className="space-y-1">
                        {!search ?
                          <>
                            <p className="font-medium text-slate-900">Daftar Master Produk Kosong</p>
                            <p className="text-sm text-slate-500">Coba daftarkan produk terlebih dahulu.</p>
                          </>
                          :
                          <>
                            <p className="font-medium text-slate-900">Hasil pencarian tidak ditemukan</p>
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
        {/* --- UI PAGINATION (TAMBAHKAN INI) --- */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium hidden md:block">
            Menampilkan <span className="text-slate-900">{products.length}</span> dari <span className="text-slate-900">{pagination.totalData}</span> produk
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

      {/* Dialog Add */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Produk Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase">SKU / Kode Barang</p>
              <Input
                value={newProduct.sku}
                className={`${errors.sku ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
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
              <p className="text-xs font-bold text-slate-500 uppercase">Nama Produk</p>
              <Input
                value={newProduct.name}
                className={`${errors.name ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
                onChange={e => {
                  setNewProduct({ ...newProduct, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: "" });
                }}
                placeholder="Nama barang lengkap"
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Kategori</p>
              <Input
                value={newProduct.category}
                className={`${errors.category ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
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
                <p className="text-xs font-bold text-slate-500 uppercase">Harga Jual</p>
                <Input type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase">Stok Awal</p>
                <Input type="number" value={newProduct.quantity} onChange={e => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={handleAdd}>Simpan Produk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Produk</DialogTitle>
          </DialogHeader>

          {editingProduct && (
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase">SKU / Kode Barang</p>
                <Input
                  value={editingProduct.sku}
                  className={`${errors.sku ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
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
                <p className="text-xs font-bold text-slate-500 uppercase">Nama Produk</p>
                <Input
                  value={editingProduct.name}
                  className={`${errors.name ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
                  onChange={e => {
                    setEditingProduct({ ...editingProduct, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" })
                  }
                  }
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase">Kategori</p>
                <Input
                  value={editingProduct.category}
                  className={`${errors.category ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
                  onChange={e => {
                    setEditingProduct({ ...editingProduct, category: e.target.value });
                    if (errors.category) setErrors({ ...errors, category: "" })
                  }}
                />
                {errors.category && <FieldError>{errors.category}</FieldError>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase">Harga Jual</p>
                  <Input
                    type="number"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase">Stok</p>
                  <Input
                    type="number"
                    value={editingProduct.quantity}
                    onChange={e => setEditingProduct({ ...editingProduct, quantity: Number(e.target.value) })}
                  />
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

      {/* Dialog History */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 border-l-0 shadow-2xl">
          <SheetHeader className="p-6 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100">
                <History size={20} />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-slate-800 truncate max-w-[200px]">
                  Riwayat {editingProduct?.name}
                </SheetTitle>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">SKU: {editingProduct?.sku}</p>
              </div>
            </div>
          </SheetHeader>

          <div className="p-6 overflow-y-auto h-[calc(100vh-100px)]">
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : history.length > 0 ? (
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {history.map((log, i) => (
                  <div key={i} className="relative flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      {/* ICON STATUS */}
                      <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-110 ${log.type === 'MASUK' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
                        }`}>
                        {log.type === 'MASUK' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>

                      {/* INFO TEXT */}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">
                          {log.type === 'MASUK' ? 'Stok Masuk' : 'Terjual'}
                        </span>
                        <span className="text-[10px] text-slate-400">{log.note}</span>
                      </div>
                    </div>

                    {/* HARGA & QTY */}
                    <div className="text-right">
                      <p className={`text-sm font-black ${log.type === 'MASUK' ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {log.type === 'MASUK' ? '+' : '-'}{log.qty}
                      </p>
                      <p className="text-[9px] font-medium text-slate-400">
                        @ Rp {Number(log.price).toLocaleString()}
                      </p>
                    </div>

                    {/* TOOLTIP WAKTU (ABSOLUTE) */}
                    <div className="absolute -top-4 left-14 text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                      {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-300 opacity-50">
                <History size={48} className="mb-2" />
                <p className="text-sm italic">Belum ada riwayat pergerakan stok.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah kamu yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk <b>{editingProduct?.name}</b> akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(editingProduct?.id)}>Ya</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}