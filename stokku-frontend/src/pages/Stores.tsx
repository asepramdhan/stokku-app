/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Edit2, Filter, Globe, Plus, Search, Store, Trash2, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_URL = `${import.meta.env.VITE_API_URL}/stores`;

type Store = {
  name: string;
  platform: string;
  admin_fee: number;
  extra_promo_fee: number;
  handling_fee: number;
};

export default function Stores() {
  // Initial State
  const [stores, setStores] = useState<Store[]>([]),
    [search, setSearch] = useState(""),
    [filterPlatform, setFilterPlatform] = useState("All"),
    [page, setPage] = useState(1), // State Halaman
    [pagination, setPagination] = useState<any>({ totalPages: 1, totalData: 0 }),
    [globalStats, setGlobalStats] = useState<any>({ totalStores: 0, onlineStores: 0, offlineStores: 0 }),
    [isLoading, setIsLoading] = useState(true),
    [errors, setErrors] = useState<{ [key: string]: string }>({}),
    [isAddOpen, setIsAddOpen] = useState(false),
    [newStore, setNewStore] = useState({ name: "", platform: "", admin_fee: 0, extra_promo_fee: 0, handling_fee: 1250 }),
    [isEditOpen, setIsEditOpen] = useState(false),
    [editingStore, setEditingStore] = useState<any>(null),
    [isDeleteOpen, setIsDeleteOpen] = useState(false),
    // Timer
    timer = 500;

  // Re-fetch saat page, search, atau platform berubah
  useEffect(() => {
    fetchStores();
  }, [page, search, filterPlatform]);

  // Fungsi untuk menampilkan teks error
  const FieldError = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[11px] font-medium text-pink-600 animate-in fade-in slide-in-from-top-1">
      {children}
    </span>
  ),

    // Fungsi Ambil Stores
    fetchStores = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token"),
          headers = {
            "Authorization": `Bearer ${token}`, // Tiket masuk
            "Accept": "application/json",
          },
          res = await fetch(`${API_URL}?page=${page}&search=${search}&platform=${filterPlatform}&limit=10`, { headers });

        // 💡 CEK: Jika salah satu return 401 (Unauthorized), tendang ke login
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        const result = await res.json();

        setStores(result.stores);
        setPagination(result.pagination);
        setGlobalStats(result.stats);
      } finally {
        setIsLoading(false);
      }
    },

    // 💡 Reset ke halaman 1 saat filter diubah
    handleSearchChange = (val: string) => { setSearch(val); setPage(1); },
    handlePlatformChange = (val: string) => { setFilterPlatform(val); setPage(1); },

    // Fungsi Tambah 
    handleAdd = async () => {
      // Reset errors setiap kali tombol diklik
      const newErrors: { [key: string]: string } = {};

      // Logika Validasi
      if (!newStore.name.trim()) newErrors.name = "Nama toko tidak boleh kosong!";
      if (!newStore.platform) newErrors.platform = "Pilih platform marketplace!";

      // Jika ada error, set state dan batalkan kirim data
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newStore),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Terjadi kesalahan saat menambahkan toko.");
        }

        setIsAddOpen(false);
        setNewStore({ name: "", platform: "", admin_fee: 0, extra_promo_fee: 0, handling_fee: 1250 });
        setErrors({}); // Bersihkan error
        toast.promise<{ name: string }>(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ name: newStore.name }), timer)
            ),
          {
            loading: "Loading...",
            success: (data) => {
              return (
                fetchStores(),
                `Toko ${data.name} berhasil ditambahkan!`
              );
            },
            error: "Error",
          }
        )

      } catch (error: any) {
        toast.error("Waduh, terjadi kesalahan: " + error.message);
      }
    },

    // Fungsi Edit
    handleUpdate = async () => {
      // Reset errors setiap kali tombol diklik
      const newErrors: { [key: string]: string } = {};

      // Logika Validasi
      if (!editingStore.name.trim()) newErrors.name = "Nama toko tidak boleh kosong!";
      if (!editingStore.platform) newErrors.platform = "Pilih platform marketplace!";

      // Jika ada error, set state dan batalkan kirim data
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/${editingStore.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingStore),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Terjadi kesalahan saat mengubah toko.");
        }

        setIsEditOpen(false);
        setErrors({});
        toast.promise<{ name: string }>(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ name: editingStore.name }), timer)
            ),
          {
            loading: "Loading...",
            success: (data) => {
              return (
                fetchStores(),
                `Toko ${data.name} berhasil diubah!`
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
            setTimeout(() => resolve({ name: editingStore.name }), timer)
          ),
        {
          loading: "Loading...",
          success: (data) => {
            return (
              fetchStores(),
              `Toko ${data.name} berhasil dihapus!`
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
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Toko</h1>
          <p className="text-slate-500 text-sm font-medium dark:text-slate-400">
            Kelola channel penjualan online dan offline kamu.
          </p>
        </div>

        {/* Button jadi full width di mobile, balik ke auto di desktop */}
        <Button
          onClick={() => { setIsAddOpen(true); setErrors({}) }}
          className="gap-2 w-full md:w-auto shadow-md dark:shadow-none dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
        >
          <Plus size={18} /> Tambah Toko
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm dark:border-t-0 dark:border-r-0 dark:border-b dark:bg-slate-800">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full dark:bg-slate-700 dark:text-slate-200">
              <Store size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Toko</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : globalStats.totalStores}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm dark:border-t-0 dark:border-r-0 dark:border-b dark:bg-slate-800">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-full dark:bg-green-600 dark:text-white">
              <Globe size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Toko Online</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : globalStats.onlineStores}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm dark:border-t-0 dark:border-r-0 dark:border-b dark:bg-slate-800">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-full dark:bg-orange-600 dark:text-white">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Toko Offline</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : globalStats.offlineStores}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* INPUT SEARCH BAR */}
        <div className="flex-1 bg-white border rounded-lg shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <InputGroup>
            <InputGroupInput
              placeholder="Cari toko..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {search &&
                <InputGroupButton
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => handleSearchChange("")}
                >
                  <X size={16} />
                </InputGroupButton>
              }
              {stores.length} results
            </InputGroupAddon>
          </InputGroup>
        </div>
        {/* DROPDOWN FILTER PLATFORM */}
        <div className="flex items-center gap-2 bg-white border px-3 py-1 rounded-lg shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <Filter size={14} className="text-slate-400 dark:text-slate-300" />
          <select
            className="w-full text-sm font-bold bg-transparent outline-none min-w-[120px] cursor-pointer dark:bg-slate-800"
            value={filterPlatform}
            onChange={(e) => handlePlatformChange(e.target.value)}
          >
            <option value="All">Semua Platform</option>
            <option value="Shopee">Shopee</option>
            <option value="Tokopedia">Tokopedia</option>
            <option value="TikTok Shop">TikTok Shop</option>
            <option value="Lazada">Lazada</option>
            <option value="Offline / Fisik">Offline / Fisik</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
        <div className="overflow-x-auto"> {/* Memastikan tabel bisa di-scroll di HP jika kolom terlalu panjang */}
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[200px] font-semibold">Platform</TableHead>
                <TableHead className="font-semibold">Nama Toko</TableHead>
                <TableHead className="font-semibold truncate w-[200px]">Biaya (Admin/Extra/Proc)</TableHead>
                <TableHead className="text-right font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : stores.length > 0 ? (
                stores.map((store: any) => (
                  <TableRow key={store.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="truncate">
                      <Badge
                        variant="secondary"
                        className={`font-medium shadow-sm ${store.platform === 'Shopee' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          store.platform === 'Tokopedia' ? 'bg-green-100 text-green-700 border-green-200' :
                            store.platform === 'TikTok Shop' ? 'bg-slate-900 text-white' :
                              store.platform === 'Lazada' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-slate-100 text-slate-600'
                          }`}
                      >
                        {store.platform || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="truncate">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{store.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="truncate">
                      <div className="flex gap-2 text-[11px] font-medium">
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                          Adm: {Number(store.admin_fee)}%
                        </span>
                        <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">
                          Ext: {Number(store.extra_promo_fee)}%
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          Fix: Rp {Number(store.handling_fee).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => { setEditingStore(store); setIsEditOpen(true); setErrors({}) }}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setEditingStore(store); setIsDeleteOpen(true); }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-full text-slate-300">
                        {!search ?
                          <Store size={32} />
                          :
                          <Search size={32} />
                        }
                      </div>
                      <div className="space-y-1">
                        {!search ?
                          <>
                            <p className="font-medium text-slate-900">Daftar Toko Kosong</p>
                            <p className="text-sm text-slate-500">Coba daftarkan toko terlebih dahulu.</p>
                          </>
                          :
                          <>
                            <p className="font-medium text-slate-900">Toko tidak ditemukan</p>
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
          {/* --- UI PAGINATION (TAMBAHKAN DI BAWAH TABLE) --- */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 font-sans">
            <p className="text-xs text-slate-500 font-medium hidden md:block">
              Menampilkan <span className="text-slate-900">{stores.length}</span> dari <span className="text-slate-900">{pagination.totalData}</span> toko
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="h-8 px-3 text-xs font-bold"
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
                className="h-8 px-3 text-xs font-bold"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Add */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Daftarkan Toko Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Input
                placeholder="Nama Toko (e.g. Meowmeal Official)"
                className={`${errors.name ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
                value={newStore.name}
                onChange={e => {
                  setNewStore({ ...newStore, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: "" }); // Hapus error saat user mulai ngetik
                }}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>
            <div className="space-y-1">
              <select
                className={`w-full border p-2 rounded-md text-sm ${errors.platform ? 'border-pink-500' : ''}`}
                value={newStore.platform}
                onChange={e => {
                  setNewStore({ ...newStore, platform: e.target.value });
                  if (errors.platform) setErrors({ ...errors, platform: "" });
                }}
              >
                <option value="">-- Pilih Platform --</option>
                <option value="Shopee">Shopee</option>
                <option value="Tokopedia">Tokopedia</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Lazada">Lazada</option>
                <option value="Offline / Fisik">Offline / Fisik</option>
              </select>
              {errors.platform && <FieldError>{errors.platform}</FieldError>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Admin %</p>
                <Input
                  type="number"
                  placeholder="0"
                  value={newStore.admin_fee}
                  onChange={e => setNewStore({ ...newStore, admin_fee: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Extra %</p>
                <Input
                  type="number"
                  placeholder="0"
                  value={newStore.extra_promo_fee}
                  onChange={e => setNewStore({ ...newStore, extra_promo_fee: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Proses (Rp)</p>
                <Input
                  type="number"
                  placeholder="1250"
                  value={newStore.handling_fee}
                  onChange={e => setNewStore({ ...newStore, handling_fee: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={handleAdd}>Simpan Toko</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Toko</DialogTitle></DialogHeader>

          {editingStore && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Input
                  placeholder="Nama Toko (e.g. Meowmeal Official)"
                  className={`${errors.name ? 'border-pink-500' : ''} invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500`}
                  value={editingStore.name}
                  onChange={e => {
                    setEditingStore({ ...editingStore, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </div>
              <div className="space-y-1">
                <select
                  className={`w-full border p-2 rounded-md text-sm ${errors.platform ? 'border-pink-500' : ''}`}
                  value={editingStore.platform}
                  onChange={e => {
                    setEditingStore({ ...editingStore, platform: e.target.value });
                    if (errors.platform) setErrors({ ...errors, platform: "" });
                  }}
                >
                  <option value="">-- Pilih Platform --</option>
                  <option value="Shopee">Shopee</option>
                  <option value="Tokopedia">Tokopedia</option>
                  <option value="TikTok Shop">TikTok Shop</option>
                  <option value="Lazada">Lazada</option>
                  <option value="Offline / Fisik">Offline / Fisik</option>
                </select>
                {errors.platform && <FieldError>{errors.platform}</FieldError>}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Admin %</p>
                  <Input
                    type="number"
                    placeholder="0"
                    value={editingStore.admin_fee}
                    onChange={e => setEditingStore({ ...editingStore, admin_fee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Extra %</p>
                  <Input
                    type="number"
                    placeholder="0"
                    value={editingStore.extra_promo_fee}
                    onChange={e => setEditingStore({ ...editingStore, extra_promo_fee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Proses (Rp)</p>
                  <Input
                    type="number"
                    placeholder="1250"
                    value={editingStore.handling_fee}
                    onChange={e => setEditingStore({ ...editingStore, handling_fee: Number(e.target.value) })}
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
              Toko <b>{editingStore?.name}</b> akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(editingStore?.id)}>Ya</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}