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
import { AlertTriangle, Box, Edit2, Filter, Layers, Package, Plus, Search, Trash2, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";

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
  // Fungsi Search
  useEffect(() => { fetchProducts(); }, []);

  // Initial State
  const [products, setProducts] = useState<Product[]>([]),
    [search, setSearch] = useState(""),
    [filterCategory, setFilterCategory] = useState("All"),
    [isAddOpen, setIsAddOpen] = useState(false),
    [newProduct, setNewProduct] = useState({ sku: "", name: "", category: "", quantity: 0, price: 0, avg_cost: 0 }),
    [isEditOpen, setIsEditOpen] = useState(false),
    [editingProduct, setEditingProduct] = useState<any>(null),
    [isLoading, setIsLoading] = useState(true),
    [errors, setErrors] = useState<{ [key: string]: string }>({}),
    [isDeleteOpen, setIsDeleteOpen] = useState(false),

    // Timer
    timer = 1000,

    // --- LOGIKA STATISTIK ---
    totalItems = products.length,
    totalStockPcs = products.reduce((acc, curr) => acc + Number(curr.quantity), 0),
    lowStockCount = products.filter(p => p.quantity < 10).length,

    // AMBIL DAFTAR KATEGORI UNIK DARI DATA
    categories = ["All", ...new Set(products.map(p => p.category || "Umum"))],

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

    // Fungsi Ambil
    fetchProducts = async () => {
      setIsLoading(true); // Mulai loading
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        setProducts(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false); // Selesai loading
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProduct),
        });

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingProduct),
        });

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
      await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      setIsDeleteOpen(false);
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
              `Produk ${data.name} berhasil dihapus!`
            );
          },
          error: "Error",
        }
      )
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
              <h3 className="text-2xl font-bold">{isLoading ? "..." : totalItems} Item</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-full"><Layers size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Stok (Gudang)</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : totalStockPcs.toLocaleString()} Pcs</h3>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 shadow-sm ${lowStockCount > 0 ? "border-l-red-500" : "border-l-slate-300"}`}>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={`p-2 rounded-full ${lowStockCount > 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Stok Menipis (&lt; 10)</p>
              <h3 className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-600" : "text-slate-600"}`}>
                {isLoading ? "..." : lowStockCount} Item
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
              onChange={(e) => setSearch(e.target.value)}
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
            onChange={(e) => setFilterCategory(e.target.value)}
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
                <TableHead className="w-[100px]">SKU</TableHead>
                <TableHead className="truncate w-[300px]">Nama Produk</TableHead>
                <TableHead className="w-[200px]">Kategori</TableHead>
                <TableHead className="truncate w-[200px]">Harga Jual</TableHead>
                <TableHead className="truncate w-[100px] text-right">Stok Gudang</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Tampilkan 5 baris skeleton sebagai placeholder
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Skeleton className="h-8 w-14" />
                      <Skeleton className="h-8 w-14" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((product: any) => (
                  <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="font-mono text-xs text-slate-500">{product.sku || '-'}</TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">{product.name}</TableCell>
                    <TableCell>{product.category || 'Umum'}</TableCell>
                    <TableCell className="font-mono text-slate-500 truncate max-w-[100px]">{product.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${product.quantity < 10 ? 'text-red-500' : 'text-slate-700'}`}>
                        {product.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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