/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeDollarSign, Box, Plus, Search, Store, ShoppingCart, X, Edit2, Trash2, Filter, Calendar, Layers } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const API_SALES = `${import.meta.env.VITE_API_URL}/sales`,
  API_PRODUCTS = `${import.meta.env.VITE_API_URL}/products`,
  API_STORES = `${import.meta.env.VITE_API_URL}/stores`;

export default function Sales() {
  const [sales, setSales] = useState<any[]>([]),
    [products, setProducts] = useState<any[]>([]),
    [stores, setStores] = useState<any[]>([]),
    [search, setSearch] = useState(""),
    [range, setRange] = useState("all"),
    [page, setPage] = useState(1),
    [pagination, setPagination] = useState<any>({ totalPages: 1, totalData: 0 }),
    [globalStats, setGlobalStats] = useState({ totalRevenue: 0, totalQty: 0, transactionCount: 0 }),
    [filterStore, setFilterStore] = useState("All"),
    [isLoading, setIsLoading] = useState(true),
    [errors, setErrors] = useState<{ [key: string]: string }>({}),
    [isAddOpen, setIsAddOpen] = useState(false),
    [isBulkOpen, setIsBulkOpen] = useState(false),
    [newSale, setNewSale] = useState({ product_id: "", store_id: "", qty: 1, selling_price: 0 }),
    [isEditOpen, setIsEditOpen] = useState(false),
    [editingSale, setEditingSale] = useState<any>(null),
    [isDeleteOpen, setIsDeleteOpen] = useState(false),
    [bulkStoreId, setBulkStoreId] = useState(""),
    [bulkItems, setBulkItems] = useState([{ product_id: "", qty: 1, selling_price: 0 }]),
    timer = 1000;

  // Trigger fetch saat halaman, pencarian, atau filter berubah
  useEffect(() => {
    fetchData();
  }, [page, range, search, filterStore]);

  // AMBIL DATA
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const url = `${API_SALES}?page=${page}&range=${range}&search=${search}&store=${filterStore}&limit=10`,
        [resSales, resProd, resStore] = await Promise.all([
          fetch(url),
          fetch(`${API_PRODUCTS}?limit=999`),
          fetch(API_STORES)
        ]),

        dataSales = await resSales.json(),
        dataProd = await resProd.json(),
        dataStore = await resStore.json();

      setSales(dataSales.sales || []);
      setPagination(dataSales.pagination);
      setGlobalStats(dataSales.stats);

      setProducts(dataProd.products || (Array.isArray(dataProd) ? dataProd : []));
      setStores(dataStore.stores || (Array.isArray(dataStore) ? dataStore : []));
    } finally {
      setIsLoading(false);
    }
  },

    // FILTER GANDA (Search + Store)
    filtered = sales.filter((s: any) => {
      const matchesSearch = s.product_name.toLowerCase().includes(search.toLowerCase()) ||
        s.store_name.toLowerCase().includes(search.toLowerCase());
      const matchesStore = filterStore === "All" || s.store_name === filterStore;
      return matchesSearch && matchesStore;
    }),

    // Fungsi untuk menampilkan teks error
    FieldError = ({ children }: { children: React.ReactNode }) => (
      <span className="text-[11px] font-medium text-pink-600 animate-in fade-in slide-in-from-top-1">{children}</span>
    ),

    // Fungsi untuk menambahkan penjualan
    handleAdd = async () => {
      const newErrors: { [key: string]: string } = {};
      if (!newSale.product_id) newErrors.product = "Pilih produk!";
      if (!newSale.store_id) newErrors.store = "Pilih toko!";
      if (newSale.qty <= 0) newErrors.qty = "Qty minimal 1!";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      try {
        const res = await fetch(API_SALES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSale),
        });

        if (!res.ok) throw new Error("Gagal simpan transaksi");

        setIsAddOpen(false);
        setNewSale({ product_id: "", store_id: "", qty: 1, selling_price: 0 });
        toast.promise(new Promise((resolve) => setTimeout(resolve, timer)), {
          loading: "Memproses transaksi...",
          success: () => { fetchData(); return "Transaksi Berhasil & Stok Berkurang!"; },
          error: "Gagal",
        });
      } catch (error: any) {
        toast.error(error.message);
      }
    },

    // Fungsi Menambah Baris Baru di Form
    addBulkRow = () => {
      setBulkItems([...bulkItems, { product_id: "", qty: 1, selling_price: 0 }]);
    },

    // Fungsi Menghapus Baris
    removeBulkRow = (index: number) => {
      setBulkItems(bulkItems.filter((_, i) => i !== index));
    },

    // Fungsi Update Baris Tertentu
    updateBulkItem = (index: number, field: string, value: any) => {
      const newItems: any = [...bulkItems];
      newItems[index][field] = value;

      // Jika ganti produk, otomatis tarik harga jual defaultnya
      if (field === "product_id") {
        const p = products.find(prod => prod.id === Number(value));
        newItems[index].selling_price = p?.price || 0;
      }

      setBulkItems(newItems);
    },

    // Fungsi Simpan Massal
    handleBulkSave = async () => {
      if (!bulkStoreId) return toast.error("Pilih Toko dulu!");

      try {
        const res = await fetch(`${API_SALES}/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store_id: bulkStoreId, sales: bulkItems }),
        });

        if (!res.ok) throw new Error("Gagal proses massal");

        setIsBulkOpen(false);
        setBulkItems([{ product_id: "", qty: 1, selling_price: 0 }]);
        toast.success("Semua transaksi berhasil disimpan!");
        fetchData();
      } catch (error: any) {
        toast.error(error.message);
      }
    },

    // FUNGSI UPDATE
    handleUpdate = async () => {
      try {
        const res = await fetch(`${API_SALES}/${editingSale.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingSale),
        });
        if (!res.ok) throw new Error("Gagal update");
        setIsEditOpen(false);
        toast.promise(new Promise((resolve) => setTimeout(resolve, timer)), {
          loading: "Memperbarui transaksi...",
          success: () => { fetchData(); return "Transaksi Berhasil diupdate!"; },
          error: "Gagal",
        })
      } catch (error: any) { toast.error(error.message); }
    },

    // FUNGSI HAPUS
    handleDelete = async (id: number) => {
      try {
        const res = await fetch(`${API_SALES}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Gagal hapus");
        setIsDeleteOpen(false);
        toast.promise(new Promise((resolve) => setTimeout(resolve, timer)), {
          loading: "Menghapus transaksi...",
          success: () => { fetchData(); return "Transaksi Berhasil dihapus!"; },
          error: "Gagal",
        })
      } catch (error: any) { toast.error(error.message); }
    };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaksi Penjualan</h1>
          <p className="text-slate-500 text-sm font-medium">Catat penjualan online dan offline harian kamu.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setIsAddOpen(true); setErrors({}); }} className="gap-2 w-full md:w-auto shadow-md">
            <Plus size={18} /> Input Penjualan
          </Button>
          <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="gap-2 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50">
            <Layers size={18} /> Input Massal
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-full"><BadgeDollarSign size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Omset</p>
              <h3 className="text-xl font-bold">Rp {Number(globalStats.totalRevenue).toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><ShoppingCart size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Barang Terjual</p>
              <h3 className="text-xl font-bold">{globalStats.totalQty} Pcs</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><Store size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Transaksi</p>
              <h3 className="text-xl font-bold">{globalStats.transactionCount} Pesanan</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 bg-white border rounded-lg shadow-sm">
          <InputGroup>
            <InputGroupInput placeholder="Cari nama barang atau toko..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <select
              className="text-xs font-bold bg-transparent outline-none cursor-pointer"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>

          {/* FILTER TOKO */}
          <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select
              className="text-xs font-bold bg-transparent outline-none min-w-[100px] cursor-pointer"
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
            >
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
                <TableHead className="truncate w-[150px]">Tanggal & Waktu</TableHead>
                <TableHead className="w-[250px]">Produk</TableHead>
                <TableHead className="w-[150px]">Toko</TableHead>
                <TableHead className="w-[100px]">Qty</TableHead>
                <TableHead className="truncate w-[150px]">Total Harga</TableHead>
                <TableHead className="text-right w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sales.length > 0 ? (
                sales.map((sale: any) => (
                  <TableRow key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="text-slate-400 text-xs truncate w-[150px]">{new Date(sale.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">{sale.product_name}</TableCell>
                    <TableCell className="truncate w-[150px]"><Badge variant="outline">{sale.store_name}</Badge></TableCell>
                    <TableCell className="truncate w-[100px]">{sale.qty} Pcs</TableCell>
                    <TableCell className="font-bold text-green-600 truncate w-[150px]">Rp {Number(sale.total_price).toLocaleString()}</TableCell>
                    <TableCell className="text-right w-[100px]">
                      <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => { setEditingSale(sale); setIsEditOpen(true); }}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => { setEditingSale(sale); setIsDeleteOpen(true); }}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center py-10">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Box size={32} className="opacity-20" />
                      <p>Belum ada transaksi.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* --- UI PAGINATION (TAMBAHKAN DI BAWAH TABLE) --- */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium hidden md:block">
            Menampilkan <span className="text-slate-900">{sales.length}</span> dari <span className="text-slate-900">{pagination.totalData}</span> transaksi
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3 text-xs font-bold">Sebelumnya</Button>
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 h-8 w-8 flex items-center justify-center rounded-lg border border-blue-100">{page}</span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xs font-medium text-slate-600">{pagination.totalPages}</span>
            </div>
            <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs font-bold">Selanjutnya</Button>
          </div>
        </div>
      </div>

      {/* Dialog Add Sale */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Input Penjualan Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Pilih Produk</p>
              <select className="w-full border p-2 rounded-md text-sm" onChange={e => {
                const p = products.find(prod => prod.id === Number(e.target.value));
                setNewSale({ ...newSale, product_id: e.target.value, selling_price: p?.price || 0 });
                setErrors({ ...errors, product: "" });
              }}>
                <option value="">-- Pilih Produk --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Sisa: {p.quantity})</option>)}
              </select>
              {errors.product && <FieldError>{errors.product}</FieldError>}
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Pilih Toko</p>
              <select className="w-full border p-2 rounded-md text-sm" onChange={e => {
                setNewSale({ ...newSale, store_id: e.target.value });
                setErrors({ ...errors, store: "" });
              }}>
                <option value="">-- Pilih Toko --</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.platform})</option>)}
              </select>
              {errors.store && <FieldError>{errors.store}</FieldError>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Jumlah (Qty)</p>
                <Input type="number" value={newSale.qty} onChange={e => setNewSale({ ...newSale, qty: Number(e.target.value) })} />
                {errors.qty && <FieldError>{errors.qty}</FieldError>}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Harga Jual (Satuan)</p>
                <Input type="number" value={newSale.selling_price} onChange={e => setNewSale({ ...newSale, selling_price: Number(e.target.value) })} />
              </div>
            </div>
            <p className="text-right font-bold text-blue-600 italic">Total: Rp {(newSale.qty * newSale.selling_price).toLocaleString()}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={handleAdd}>Simpan Transaksi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG BULK INPUT */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Input Penjualan Massal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Pilih Toko Global untuk satu sesi input */}
            <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-4">
              <p className="text-xs font-bold uppercase text-slate-500">Target Toko:</p>
              <select className="flex-1 border p-1.5 rounded-md text-sm" value={bulkStoreId} onChange={e => setBulkStoreId(e.target.value)}>
                <option value="">-- Pilih Toko --</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="max-h-[400px] overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead>Harga Jual</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <select className="w-full border p-1.5 rounded text-sm" value={item.product_id} onChange={e => updateBulkItem(idx, "product_id", e.target.value)}>
                          <option value="">-- Cari Produk --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stok: {p.quantity})</option>)}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={item.qty} onChange={e => updateBulkItem(idx, "qty", Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={item.selling_price} onChange={e => updateBulkItem(idx, "selling_price", Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeBulkRow(idx)} className="text-red-400"><Trash2 size={16} /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button variant="ghost" onClick={addBulkRow} className="w-full border-2 border-dashed gap-2 text-slate-500 hover:text-blue-500">
              <Plus size={16} /> Tambah Baris Transaksi
            </Button>
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div className="text-left text-sm font-bold text-blue-600">
              Total {bulkItems.length} Baris | Estimasi Omset: Rp {bulkItems.reduce((acc, curr) => acc + (curr.qty * curr.selling_price), 0).toLocaleString()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsBulkOpen(false)}>Batal</Button>
              <Button onClick={handleBulkSave}>Simpan Semua Transaksi</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG EDIT */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Penjualan</DialogTitle></DialogHeader>
          {editingSale && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Qty</p>
                <Input type="number" value={editingSale.qty} onChange={e => setEditingSale({ ...editingSale, qty: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Harga Jual</p>
                <Input type="number" value={editingSale.selling_price} onChange={e => setEditingSale({ ...editingSale, selling_price: Number(e.target.value) })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleUpdate}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DELETE */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>Stok akan dikembalikan secara otomatis.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(editingSale?.id)} className="bg-red-600">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}