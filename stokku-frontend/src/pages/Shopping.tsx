/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, Plus, Search, Trash2, X, ShoppingCart, Edit2, Filter } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const API_SHOPPING = `${import.meta.env.VITE_API_URL}/shopping`,
  API_PRODUCTS = `${import.meta.env.VITE_API_URL}/products`;

export default function Shopping() {

  useEffect(() => { fetchData(); }, []);

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

    // Timer
    timer = 1000,

    // STATISTIK
    pendingCount = list.filter(item => item.status === 'pending').length,
    estimatedSpending = list.filter(item => item.status === 'pending').reduce((acc, curr) => acc + (curr.qty * curr.buy_price), 0),

    // FUNGSI UNTUK MENGAMBIL DATA
    fetchData = async () => {
      setIsLoading(true);
      try {
        const [resShop, resProd] = await Promise.all([fetch(API_SHOPPING), fetch(API_PRODUCTS)]);
        setList(await resShop.json());
        setProducts(await resProd.json());
      } finally { setIsLoading(false); }
    },

    // AMBIL DAFTAR KATEGORI UNIK DARI PRODUK
    categories = ["All", ...new Set(products.map(p => p.category || "Umum"))],

    // FUNGSI FILTER GANDA (Search + Status + Category)
    filtered = list.filter((item: any) => {
      const matchesSearch = item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = filterStatus === "All" || item.status === filterStatus;
      const matchesCategory = filterCategory === "All" || (item.category || "Umum") === filterCategory;

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
      if (!newOrder.product_id) return setErrors({ product: "Pilih produk dulu!" });
      try {
        await fetch(API_SHOPPING, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newOrder),
        });
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingOrder),
        });

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
        await fetch(`${API_SHOPPING}/${id}`, { method: "DELETE" });
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
        await fetch(`${API_SHOPPING}/complete/${id}`, { method: "POST" });
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
              <h3 className="text-xl font-bold">{pendingCount} Transaksi</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><ShoppingCart size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Estimasi Biaya Belanja</p>
              <h3 className="text-xl font-bold">Rp {estimatedSpending.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 bg-white border rounded-lg shadow-sm">
          <InputGroup>
            <InputGroupInput placeholder="Cari barang belanjaan..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {search && <InputGroupButton variant="ghost" onClick={() => setSearch("")}><X size={16} /></InputGroupButton>}
              {filtered.length} results
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex flex-row gap-2">
          {/* FILTER STATUS */}
          <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select
              className="w-full text-xs font-bold bg-transparent outline-none cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">Semua Status</option>
              <option value="pending">Pending (Rencana)</option>
              <option value="completed">Selesai (Masuk)</option>
            </select>
          </div>

          {/* FILTER KATEGORI */}
          <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
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
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-semibold">Produk</TableHead>
                <TableHead className="font-semibold">Qty</TableHead>
                <TableHead className="font-semibold">Harga Beli</TableHead>
                <TableHead className="font-semibold">Waktu</TableHead> {/* Kolom Baru */}
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{item.category || 'Umum'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.qty} Pcs</TableCell>
                    <TableCell>Rp {Number(item.buy_price).toLocaleString()}</TableCell>

                    {/* KOLOM WAKTU */}
                    <TableCell className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>

                    <TableCell>
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
                  <TableCell colSpan={6} className="h-40 text-center text-slate-400 italic">
                    Belum ada rencana belanja...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* DIALOG ADD */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rencana Belanja Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Pilih Produk dari Master</p>
              <select
                className={`w-full border p-2 rounded-md text-sm ${errors.product ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
                onChange={e => {
                  setNewOrder({ ...newOrder, product_id: e.target.value });
                  setErrors({ ...errors, product: "" });
                }}
              >
                <option value="">-- Pilih Produk --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Sisa: {p.quantity})</option>)}
              </select>
              {errors.product && <FieldError>{errors.product}</FieldError>}
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