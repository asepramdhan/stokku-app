/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Wallet, Receipt, Search, X, Filter,
  Calendar, AlertCircle, CheckCircle2, ArrowUpRight,
  Plus, Edit, Trash2,
  ShoppingBag
} from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Tambahan Shadcn UI untuk Form
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API_RECORDS = `${import.meta.env.VITE_API_URL}/records`;

export default function StoreRecords() {
  const [data, setData] = useState<any[]>([]),
    [search, setSearch] = useState(""),
    [filterStatus, setFilterStatus] = useState("all"),
    [filterType, setFilterType] = useState("all"),
    [page, setPage] = useState(1),
    [pagination, setPagination] = useState<any>({ totalPages: 1, totalData: 0 }),
    [summary, setSummary] = useState({ totalBill: 0, totalPaid: 0, totalDebt: 0 }),
    [isLoading, setIsLoading] = useState(true),
    [isAddModalOpen, setIsAddModalOpen] = useState(false),
    [isPayModalOpen, setIsPayModalOpen] = useState(false),
    [selectedRecord, setSelectedRecord] = useState<any>(null),
    [payAmount, setPayAmount] = useState(""),
    [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false),
    [paymentHistory, setPaymentHistory] = useState<any[]>([]),
    [historyLoading, setHistoryLoading] = useState(false),
    [isSpendModalOpen, setIsSpendModalOpen] = useState(false),
    [spendAmount, setSpendAmount] = useState(""),
    [spendNote, setSpendNote] = useState(""),
    // State untuk form Tambah/Edit
    [formData, setFormData] = useState({
      toko_name: "",
      customer_name: "",
      total_price: "",
      paid_amount: "",
      payment_type: "weekly",
      due_date: "",
      notes: "" // <-- Tambahkan ini
    });

  useEffect(() => { fetchRecords(); }, [page, search, filterStatus, filterType]);

  // FUNGSI AMBIL DATA
  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token"),
        headers = {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
        url = `${API_RECORDS}?page=${page}&search=${search}&status=${filterStatus}&type=${filterType}&limit=10`,
        res = await fetch(url, { headers });

      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const resData = await res.json();
      setData(resData.list || []);
      setPagination(resData.pagination || { totalPages: 1, totalData: 0 });
      setSummary(resData.stats || { totalBill: 0, totalPaid: 0, totalDebt: 0 });
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // FUNGSI AMBIL RIWAYAT
  const fetchHistory = async (record: any) => {
    setSelectedRecord(record);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_RECORDS}/${record.id}/history`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      setPaymentHistory(data);
    } catch (error) { toast.error("Gagal memuat riwayat"); }
    finally { setHistoryLoading(false); }
  };

  // FUNGSI SIMPAN (TAMBAH & EDIT)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedRecord;
    const url = isEdit ? `${API_RECORDS}/${selectedRecord.id}` : API_RECORDS;
    const method = isEdit ? "PUT" : "POST";

    // Pastikan tanggal kosong dikirim sebagai NULL
    const payload = {
      ...formData,
      due_date: formData.due_date === "" ? null : formData.due_date
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload) // Pakai payload yang sudah diperbaiki
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        fetchRecords(); // Refresh data & kartu stats
        // alert(isEdit ? "Data berhasil diubah!" : "Data berhasil ditambah!");
        toast.success(isEdit ? "Data berhasil diubah!" : "Data berhasil ditambah!");
      } else {
        const errorData = await res.json();
        // alert("Gagal: " + errorData.error);
        toast.error("Gagal: " + errorData.error);
      }
    } catch (error) {
      console.error("Gagal menyimpan:", error);
    }
  };

  // FUNGSI TAMBAH BELANJA
  const handleAddSpending = async () => {
    if (!selectedRecord || !spendAmount) return;
    try {
      const res = await fetch(`${API_RECORDS}/${selectedRecord.id}/add-spending`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          amount: parseFloat(spendAmount),
          notes: spendNote
        })
      });

      if (res.ok) {
        setIsSpendModalOpen(false);
        setSpendAmount("");
        setSpendNote("");
        fetchRecords(); // Refresh data tabel
        toast.success("Tagihan belanja berhasil ditambah!");
      }
    } catch (error) {
      toast.error("Gagal menambah belanja.");
    }
  };

  // FUNGSI HAPUS
  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    try {
      const res = await fetch(`${API_RECORDS}/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) fetchRecords();
      toast.success("Data berhasil dihapus!");
    } catch (error) {
      console.error("Gagal menghapus:", error);
      toast.error("Gagal menghapus!");
    }
  };

  // FUNGSI BAYAR (CICIL)
  const handlePayment = async () => {
    if (!selectedRecord || !payAmount) return;

    // const targetUrl = `${API_RECORDS}/${selectedRecord.id}/pay`;
    // console.log("Menghubungi URL:", targetUrl); // LIHAT DI KONSOL F12

    try {
      console.log("Mencoba membayar untuk ID:", selectedRecord.id); // Debugging

      const res = await fetch(`${API_RECORDS}/${selectedRecord.id}/pay`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        // Pastikan amount dikirim sebagai angka
        body: JSON.stringify({ amount: parseFloat(payAmount) })
      });

      const resData = await res.json();

      if (res.ok) {
        setIsPayModalOpen(false);
        setPayAmount("");
        fetchRecords(); // Refresh tabel dan kartu stats
        // alert("Pembayaran berhasil dicatat!");
        toast.success("Pembayaran berhasil dicatat!");
      } else {
        // alert("Gagal: " + (resData.message || "Terjadi kesalahan"));
        toast.error("Gagal: " + (resData.message || "Terjadi kesalahan"));
      }
    } catch (error) {
      console.error("Gagal bayar:", error);
      // alert("Koneksi ke server terputus.");
      toast.error("Koneksi ke server terputus.");
    }
  };

  const toRp = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  // Helper buka modal edit
  const openEdit = (item: any) => {
    setSelectedRecord(item);
    setFormData({
      toko_name: item.toko_name,
      customer_name: item.customer_name,
      total_price: item.total_price,
      paid_amount: item.paid_amount,
      payment_type: item.payment_type,
      due_date: item.due_date ? item.due_date.split('T')[0] : "",
      notes: item.notes
    });
    setIsAddModalOpen(true);
  };

  // Helper cek tanggal
  const isOverdue = (dateString: string, status: string) => {
    if (!dateString || status === 'paid') return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset waktu ke jam 00:00

    const dueDate = new Date(dateString);
    return dueDate < today; // True jika sudah lewat dari hari ini
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pencatatan Toko</h1>
          <p className="text-slate-500 text-sm font-medium">Kelola piutang marketplace dan pembayaran mingguan toko Anda.</p>
        </div>
        {/* TOMBOL TAMBAH */}
        <Button onClick={() => { setSelectedRecord(null); setFormData({ toko_name: "", customer_name: "", total_price: "", paid_amount: "", payment_type: "weekly", due_date: "", notes: "" }); setIsAddModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
          <Plus size={18} /> Tambah Catatan
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Receipt size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Tagihan</p>
              <h3 className="text-xl font-bold">{toRp(summary.totalBill)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-full"><Wallet size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Cair/Dibayar</p>
              <h3 className="text-xl font-bold text-green-600">{toRp(summary.totalPaid)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-2 bg-red-100 text-red-600 rounded-full"><ArrowUpRight size={20} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Sisa Piutang</p>
              <h3 className="text-xl font-bold text-red-600">{toRp(summary.totalDebt)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 bg-white border rounded-lg shadow-sm">
          <InputGroup>
            <InputGroupInput
              placeholder="Cari toko atau pelanggan..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {search && <InputGroupButton variant="ghost" onClick={() => handleSearch("")}><X size={16} /></InputGroupButton>}
              <span className="text-xs text-slate-400 mr-2">{pagination.totalData} data</span>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div className="flex flex-row gap-2">
          <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select
              className="w-full text-xs font-bold bg-transparent outline-none cursor-pointer"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="all">Semua Status</option>
              <option value="paid">Lunas</option>
              <option value="partial">Dicicil</option>
              <option value="pending">Tertunda</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <select
              className="w-full text-xs font-bold bg-transparent outline-none cursor-pointer"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            >
              <option value="all">Semua Tipe</option>
              <option value="cash">Tunai (Cash)</option>
              <option value="weekly">Mingguan</option>
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
                <TableHead className="w-[200px] truncate">Toko & Pelanggan</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-green-600 font-bold truncate">Total Tagihan</TableHead>
                <TableHead>Dibayar</TableHead>
                <TableHead className="text-red-600 font-bold">Sisa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px] truncate">Jatuh Tempo</TableHead>
                <TableHead className="w-[150px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : data.length > 0 ? (
                data.map((item: any) => {
                  const sisa = item.total_price - item.paid_amount;
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{item.toko_name}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.customer_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.payment_type === 'weekly' ? 'Mingguan' : 'Cash'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{toRp(item.total_price)}</TableCell>
                      <TableCell className="text-sm text-green-600 font-medium">{toRp(item.paid_amount)}</TableCell>
                      <TableCell className="text-sm text-red-600 font-bold">
                        {sisa > 0 ? toRp(sisa) : <span className="text-slate-300">-</span>}
                      </TableCell>
                      <TableCell>
                        {item.status === "paid" ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none shadow-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Lunas</Badge>
                        ) : item.status === "partial" ? (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none shadow-none"><Wallet className="w-3 h-3 mr-1" /> Dicicil</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none shadow-none"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-[11px] font-medium ${isOverdue(item.due_date, item.status) ? "text-red-600 font-bold" : "text-slate-500"}`}>
                        <div className="flex items-center gap-1">
                          {isOverdue(item.due_date, item.status) && <AlertCircle size={12} className="text-red-600 animate-pulse" />}
                          {item.due_date ? new Date(item.due_date).toLocaleDateString("id-ID", { weekday: 'short', day: 'numeric', month: 'short' }) : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8 text-amber-600" onClick={() => fetchHistory(item)}>
                            <BookOpen size={14} /> {/* Icon buku untuk riwayat */}
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEdit(item)}><Edit size={14} /></Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => { setSelectedRecord(item); setIsSpendModalOpen(true); }}
                          >
                            <ShoppingBag size={14} />
                          </Button>
                          <Button variant="outline" size="sm" disabled={item.status === 'paid'} onClick={() => { setSelectedRecord(item); setIsPayModalOpen(true); }} className="h-8 text-xs font-bold bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                            <Wallet className="w-3 h-3 mr-1" /> Bayar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={8} className="h-48 text-center"><div className="flex flex-col items-center justify-center space-y-2"><BookOpen size={32} className="text-slate-300" /><p className="font-medium text-slate-900">Data tidak ditemukan</p></div></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium">Halaman {page} dari {pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="text-xs font-bold">Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage(page + 1)} className="text-xs font-bold">Selanjutnya</Button>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedRecord ? "Edit Catatan" : "Tambah Catatan Baru"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Nama Toko</Label>
                <Input required value={formData.toko_name} onChange={e => setFormData({ ...formData, toko_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama Pelanggan</Label>
                <Input required value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Total Harga</Label>
                <Input type="number" required value={formData.total_price} onChange={e => setFormData({ ...formData, total_price: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Uang Muka / DP</Label>
                <Input type="number" required value={formData.paid_amount} onChange={e => setFormData({ ...formData, paid_amount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Tipe Pembayaran</Label>
                <select className="w-full border rounded-md h-9 px-3 text-sm" value={formData.payment_type} onChange={e => setFormData({ ...formData, payment_type: e.target.value })}>
                  <option value="weekly">Mingguan</option>
                  <option value="cash">Tunai (Cash)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Jatuh Tempo</Label>
                <Input type="date" className="block w-full appearance-none bg-white" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter><Button type="submit" className="w-full">{selectedRecord ? "Simpan Perubahan" : "Simpan Catatan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL BELANJA */}
      <Dialog open={isSpendModalOpen} onOpenChange={setIsSpendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Belanja: {selectedRecord?.toko_name}</DialogTitle>
            <DialogDescription className="text-xs">
              Input nominal belanja hari ini untuk menambah total tagihan toko.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nominal Belanja (Rp)</Label>
              <Input type="number" placeholder="Contoh: 50000" value={spendAmount} onChange={e => setSpendAmount(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Catatan Barang (Opsional)</Label>
              <Input placeholder="Misal: Beli pakan burung 2 dus" value={spendNote} onChange={e => setSpendNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddSpending} className="w-full bg-orange-600 hover:bg-orange-700">Simpan Belanja</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL BAYAR */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bayar Cicilan: {selectedRecord?.toko_name}</DialogTitle>
            {/* Tambahkan baris ini di bawah DialogTitle agar warning hilang */}
            <DialogDescription className="text-xs">
              Masukkan nominal pembayaran untuk mengurangi sisa piutang.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs text-slate-500 italic">Sisa Hutang: <span className="font-bold text-red-600">{toRp(selectedRecord?.total_price - selectedRecord?.paid_amount)}</span></p></div>
            <div className="space-y-2">
              <Label>Nominal Pembayaran (Rp)</Label>
              <Input type="number" placeholder="Masukkan angka..." value={payAmount} onChange={e => setPayAmount(e.target.value)} autoFocus />
            </div>
          </div>
          <DialogFooter><Button onClick={handlePayment} className="w-full bg-green-600 hover:bg-green-700">Konfirmasi Bayar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL RIWAYAT GABUNGAN + SUMMARY */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="text-blue-600" size={20} />
              Riwayat Mutasi: {selectedRecord?.toko_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Data transaksi kronologis belanja dan pembayaran.
            </DialogDescription>
          </DialogHeader>

          {/* SEKSI SUMMARY CARD */}
          {!historyLoading && paymentHistory.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Belanja Bulan Ini</p>
                <p className="text-sm font-bold text-orange-700">
                  {toRp(paymentHistory
                    .filter(h => h.type === 'spending' && new Date(h.date).getMonth() === new Date().getMonth())
                    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0)
                  )}
                </p>
              </div>
              <div className="bg-green-50 border border-green-100 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Cicilan Bulan Ini</p>
                <p className="text-sm font-bold text-green-700">
                  {toRp(paymentHistory
                    .filter(h => h.type === 'payment' && new Date(h.date).getMonth() === new Date().getMonth())
                    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0)
                  )}
                </p>
              </div>
            </div>
          )}

          {/* TABEL RIWAYAT */}
          <div className="space-y-4 py-2">
            {historyLoading ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : paymentHistory.length > 0 ? (
              <div className="border rounded-lg overflow-hidden max-h-[350px] overflow-y-auto shadow-inner">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs">Keterangan</TableHead>
                      <TableHead className="text-right text-xs">Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((h, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(h.date).toLocaleString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">{h.notes || "Tanpa catatan"}</span>
                            <div className="mt-1">
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 border-none ${h.type === 'spending' ? "text-orange-600 bg-orange-100" : "text-green-600 bg-green-100"
                                }`}>
                                {h.type === 'spending' ? "Belanja Stok" : "Cicilan Masuk"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <span className={`text-sm font-bold ${h.type === 'spending' ? "text-red-600" : "text-green-600"}`}>
                            {h.type === 'spending' ? "+" : "-"}{toRp(h.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-lg text-slate-400 text-sm italic">
                Belum ada aktivitas transaksi.
              </div>
            )}
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-2 border-t pt-4">
            <div className="text-[10px] text-slate-400 leading-tight">
              Sisa Hutang Saat Ini:<br />
              <span className="text-sm font-bold text-slate-900">{toRp(selectedRecord?.total_price - selectedRecord?.paid_amount)}</span>
            </div>
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}