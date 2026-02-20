/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Wallet, Receipt, Search, X, Filter,
  Calendar, AlertCircle, CheckCircle2, ArrowUpRight,
  Plus, Edit, Trash2,
  ShoppingBag,
  Calculator,
  FileText,
  BarChart3,
  Download
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
import { toPng } from 'html-to-image';

const API_RECORDS = `${import.meta.env.VITE_API_URL}/records`;

export default function StoreRecords() {
  const [data, setData] = useState<any[]>([]),
    [search, setSearch] = useState(localStorage.getItem("sr_search") || ""),
    [filterStatus, setFilterStatus] = useState(localStorage.getItem("sr_status") || "all"),
    [filterType, setFilterType] = useState(localStorage.getItem("sr_type") || "all"),
    [page, setPage] = useState(Number(localStorage.getItem("sr_page")) || 1),
    [pagination, setPagination] = useState<any>({ totalPages: 1, totalData: 0 }),
    [summary, setSummary] = useState({ totalBill: 0, totalPaid: 0, totalDebt: 0 }),
    [isLoading, setIsLoading] = useState(true),
    [isAddModalOpen, setIsAddModalOpen] = useState(false),
    [isPayModalOpen, setIsPayModalOpen] = useState(false),
    [selectedRecord, setSelectedRecord] = useState<any>(null),
    [payAmount, setPayAmount] = useState(""),
    [paymentHistory, setPaymentHistory] = useState<any[]>([]),
    [historyLoading, setHistoryLoading] = useState(false),
    [isSpendModalOpen, setIsSpendModalOpen] = useState(false),
    [spendAmount, setSpendAmount] = useState(""),
    [spendNote, setSpendNote] = useState(""),
    [isCalcOpen, setIsCalcOpen] = useState(false),
    [calcInput, setCalcInput] = useState(""),
    [calcTotal, setCalcTotal] = useState(0),
    [calcLabel, setCalcLabel] = useState(""),
    [calcTarget, setCalcTarget] = useState<'main' | 'spending'>('main'),
    [isReportOpen, setIsReportOpen] = useState(false),
    reportRef = useRef<HTMLDivElement>(null),
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

  // Simpan filter pencatatan toko ke localStorage tiap kali ada perubahan
  useEffect(() => {
    localStorage.setItem("sr_search", search);
    localStorage.setItem("sr_status", filterStatus);
    localStorage.setItem("sr_type", filterType);
    localStorage.setItem("sr_page", page.toString());
  }, [search, filterStatus, filterType, page]);

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
    setIsReportOpen(true);
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
  },

    // Fungsi hitung otomatis (Simple Math Evaluator)
    evaluateMath = (val: string) => {
      setCalcInput(val);
      try {
        // Hanya izinkan angka dan operator matematika dasar
        const sanitized = val.replace(/[^0-9+\-*/. ]/g, "");
        const result = new Function(`return ${sanitized || 0}`)();
        setCalcTotal(typeof result === "number" ? result : 0);
      } catch {
        setCalcTotal(0);
      }
    };

  const handleExportImage = async () => {
    if (reportRef.current === null) return;

    const loadingToast = toast.loading("Sedang menyiapkan gambar...");

    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff', // Biar background-nya putih bersih, gak transparan
        style: {
          padding: '20px', // Kasih jarak aman di pinggir gambar
        }
      });

      const link = document.createElement('a');
      link.download = `Laporan-Piutang-${selectedRecord?.toko_name}.png`;
      link.href = dataUrl;
      link.click();

      toast.dismiss(loadingToast);
      toast.success("Laporan berhasil diunduh!");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Gagal mengambil gambar laporan.");
      console.error(err);
    }
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
                      <TableCell className="truncate">
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
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => { setSelectedRecord(item); setIsSpendModalOpen(true); }}
                            title="Pengeluaran"
                          >
                            <ShoppingBag size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={() => {
                              setSelectedRecord(item);
                              fetchHistory(item); // Kita pakai history yang sudah ada
                              setIsReportOpen(true);
                            }}
                            title="Laporan Piutang"
                          >
                            <FileText size={14} />
                          </Button>
                          <Button variant="outline" size="sm" disabled={item.status === 'paid'} onClick={() => { setSelectedRecord(item); setIsPayModalOpen(true); }} className="h-8 text-xs font-bold bg-green-50 text-green-700 border-green-200 hover:bg-green-100" title="Bayar">
                            <Wallet className="w-3 h-3 mr-1" /> Bayar
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEdit(item)} title="Edit"><Edit size={14} /></Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(item.id)} title="Hapus"><Trash2 size={14} /></Button>
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
              {/* KOLOM KIRI */}
              <div className="space-y-1">
                <Label className="text-xs flex justify-between items-center h-5"> {/* Tambah items-center & h-5 */}
                  <span>Total Harga</span>
                  <button
                    type="button"
                    onClick={() => { setCalcTarget('main'); setIsCalcOpen(true); }}
                    className="text-blue-600 hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <Calculator size={10} /> Buka Kalkulator
                  </button>
                </Label>
                <Input
                  type="number"
                  required
                  value={formData.total_price}
                  onChange={e => setFormData({ ...formData, total_price: e.target.value })}
                />
              </div>

              {/* KOLOM KANAN */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center h-5"> {/* Tambah flex items-center & h-5 */}
                  Uang Muka / DP
                </Label>
                <Input
                  type="number"
                  required
                  value={formData.paid_amount}
                  onChange={e => setFormData({ ...formData, paid_amount: e.target.value })}
                />
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
              <Label className="text-xs flex justify-between">
                Nominal Belanja (Rp)
                {/* Tombol pemicu khusus modal belanja */}
                <button
                  type="button"
                  onClick={() => { setCalcTarget('spending'); setIsCalcOpen(true); }}
                  className="text-orange-600 hover:underline flex items-center gap-1"
                >
                  <Calculator size={12} /> Kalkulator
                </button>
              </Label>
              <Input
                type="number"
                placeholder="Contoh: 50000"
                value={spendAmount}
                onChange={e => setSpendAmount(e.target.value)}
                autoFocus
              />
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

      {/* MODAL LAPORAN IKHTISAR PIUTANG */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[96vh] p-0 overflow-hidden flex flex-col shadow-2xl border-none">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div ref={reportRef} className="bg-white p-4 md:p-8">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-indigo-700">
                  <BarChart3 size={22} />
                  Laporan Ikhtisar Piutang
                </DialogTitle>
                <DialogDescription>
                  Ringkasan saldo dan riwayat transaksi untuk <b>{selectedRecord?.toko_name}</b>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* 1. KARTU RINGKASAN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Total Belanja */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Belanja</p>
                    <p className="text-sm font-black text-slate-700">{toRp(selectedRecord?.total_price)}</p>
                  </div>
                  {/* Sudah Dibayar */}
                  <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Sudah Dibayar</p>
                    <p className="text-sm font-black text-green-700">{toRp(selectedRecord?.paid_amount)}</p>
                  </div>
                  {/* Sisa Piutang */}
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Sisa Piutang</p>
                    <p className="text-sm font-black text-red-700">{toRp(selectedRecord?.total_price - selectedRecord?.paid_amount)}</p>
                  </div>
                </div>

                {/* 2. PROGRESS BAR */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 font-medium">Status Pelunasan</span>
                    <span className="text-indigo-600">
                      {Math.round((selectedRecord?.paid_amount / selectedRecord?.total_price) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      style={{ width: `${(selectedRecord?.paid_amount / selectedRecord?.total_price) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 3. DAFTAR RIWAYAT (DENGAN LOGIKA LOADING) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <BookOpen size={14} /> Riwayat Transaksi Lengkap
                  </h4>

                  <div className="border rounded-lg overflow-hidden max-h-[250px] overflow-y-auto shadow-inner bg-white">
                    <div className="divide-y divide-slate-100">
                      {/* LOGIKA LOADING SKELETON */}
                      {historyLoading ? (
                        <div className="p-4 space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between items-center">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-[150px]" />
                                <Skeleton className="h-3 w-[100px]" />
                              </div>
                              <Skeleton className="h-5 w-[80px]" />
                            </div>
                          ))}
                        </div>
                      ) : paymentHistory.length > 0 ? (
                        paymentHistory.map((h, i) => (
                          <div key={i} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-700">{h.notes || "Transaksi Toko"}</p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <div className={`text-xs font-black ${h.type === 'spending' ? "text-red-600" : "text-green-600"}`}>
                              {h.type === 'spending' ? "+" : "-"}{toRp(h.amount)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center text-xs text-slate-400 italic font-medium">
                          Belum ada aktivitas transaksi.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[8px] text-slate-300 text-right uppercase tracking-widest mt-4">
                Generated by Stokku App - {new Date().toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 md:p-6 bg-slate-50 border-t flex flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsReportOpen(false)}>
              Tutup
            </Button>
            <Button
              onClick={handleExportImage}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold"
            >
              <Download size={16} /> Download Gambar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KALKULATOR */}
      <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="text-blue-600" size={20} />
              Kalkulator Piutang Toko
            </DialogTitle>
            <DialogDescription>
              Masukkan rincian nota (contoh: 50000 + 25000 * 2)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Input Label Baru */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Nama Barang / Keterangan</Label>
              <Input
                placeholder="Contoh: Pakan Burung & Aksesoris"
                value={calcLabel}
                onChange={(e) => setCalcLabel(e.target.value)}
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Input Perhitungan</Label>
              <Input
                placeholder="0"
                value={calcInput}
                onChange={(e) => evaluateMath(e.target.value)}
                className="text-lg font-mono tracking-widest"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Hasil Perhitungan</p>
              <p className="text-2xl font-black text-blue-700">
                {toRp(calcTotal)}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['+', '-', '*', '/'].map(op => (
                <Button
                  key={op}
                  variant="outline"
                  onClick={() => evaluateMath(calcInput + op)}
                  className="font-bold"
                >
                  {op === '*' ? '×' : op === '/' ? '÷' : op}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                const fullNote = calcLabel
                  ? `${calcLabel} (${calcInput})`
                  : `Rincian: ${calcInput}`;

                // CEK TARGET: Mau dimasukkan ke mana angkanya?
                if (calcTarget === 'main') {
                  setFormData({
                    ...formData,
                    total_price: calcTotal.toString(),
                    notes: fullNote
                  });
                } else if (calcTarget === 'spending') {
                  setSpendAmount(calcTotal.toString());
                  setSpendNote(fullNote); // Otomatis mengisi Catatan Barang di Modal Belanja
                }

                setIsCalcOpen(false);
                setCalcInput("");
                setCalcLabel("");
                setCalcTotal(0);
                toast.success("Data belanja berhasil dipindahkan!");
              }}
            >
              Terapkan ke Modal
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setIsCalcOpen(false)}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}