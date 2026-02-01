/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeDollarSign, Box, Plus, Search, Store, ShoppingCart, X, Edit2, Trash2, Filter, Calendar } from "lucide-react";
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
    [filterStore, setFilterStore] = useState("All"),
    [isLoading, setIsLoading] = useState(true),
    [errors, setErrors] = useState<{ [key: string]: string }>({}),
    [isAddOpen, setIsAddOpen] = useState(false),
    [newSale, setNewSale] = useState({ product_id: "", store_id: "", qty: 1, selling_price: 0 }),
    [isEditOpen, setIsEditOpen] = useState(false),
    [editingSale, setEditingSale] = useState<any>(null),
    [isDeleteOpen, setIsDeleteOpen] = useState(false),
    timer = 1000;

  // Trigger fetch ulang setiap kali filter tanggal (range) berubah
  useEffect(() => { fetchData(); }, [range]);

  // AMBIL DATA
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resSales, resProd, resStore] = await Promise.all([
        fetch(`${API_SALES}?range=${range}`), // Kirim range ke backend
        fetch(API_PRODUCTS),
        fetch(API_STORES)
      ]);
      setSales(await resSales.json());
      setProducts(await resProd.json());
      setStores(await resStore.json());
    } finally { setIsLoading(false); }
  },

    // FILTER GANDA (Search + Store)
    filtered = sales.filter((s: any) => {
      const matchesSearch = s.product_name.toLowerCase().includes(search.toLowerCase()) ||
        s.store_name.toLowerCase().includes(search.toLowerCase());
      const matchesStore = filterStore === "All" || s.store_name === filterStore;
      return matchesSearch && matchesStore;
    }),

    // STATISTIK (Otomatis menyesuaikan hasil filter)
    totalRevenue = filtered.reduce((acc, curr) => acc + Number(curr.total_price), 0),
    totalQty = filtered.reduce((acc, curr) => acc + Number(curr.qty), 0),
    transactionCount = filtered.length,

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
        <Button onClick={() => { setIsAddOpen(true); setErrors({}); }} className="gap-2 w-full md:w-auto shadow-md">
          <Plus size={18} /> Input Penjualan
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-full"><BadgeDollarSign size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Omset</p>
              <h3 className="text-xl font-bold">Rp {totalRevenue.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><ShoppingCart size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Barang Terjual</p>
              <h3 className="text-xl font-bold">{totalQty} Pcs</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><Store size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Transaksi</p>
              <h3 className="text-xl font-bold">{transactionCount} Pesanan</h3>
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
                <TableHead className="truncate">Tanggal & Waktu</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Toko</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="truncate">Total Harga</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((sale: any) => (
                  <TableRow key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="text-slate-400 text-xs truncate">{new Date(sale.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium truncate max-w-[250px]">{sale.product_name}</TableCell>
                    <TableCell className="truncate"><Badge variant="outline">{sale.store_name}</Badge></TableCell>
                    <TableCell className="truncate">{sale.qty} Pcs</TableCell>
                    <TableCell className="font-bold text-green-600 truncate">Rp {Number(sale.total_price).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
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