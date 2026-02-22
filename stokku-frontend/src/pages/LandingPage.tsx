import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Package, ShieldCheck, Zap } from "lucide-react";
import { useTitle } from "@/hooks/useTitle";

export default function LandingPage() {
  useTitle("Solusi Inventaris Juragan");
  // Cek apakah ada token di localStorage
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 py-6 md:px-12">
        <Link to="/">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white font-black text-xl">S</div>
            <span className="text-xl font-bold tracking-tight text-slate-800">STOKKU.id</span>
          </div>
        </Link>
        {isLoggedIn ? (
          <Link to="/dashboard">
            <Button className="font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded-xl">
              Buka Dashboard
            </Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button variant="ghost" className="font-bold text-slate-600 hover:text-blue-600">
              Masuk
            </Button>
          </Link>
        )}
      </nav>

      {/* HERO SECTION */}
      <main className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-24 md:pt-32">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold mb-6 animate-bounce">
          <Zap size={14} /> Eksklusif untuk Internal
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-6">
          Kelola Stok & Penjualan <br />
          <span className="text-blue-600">Tanpa Drama.</span>
        </h1>

        <p className="max-w-2xl text-slate-500 text-lg md:text-xl mb-10 leading-relaxed">
          Sistem manajemen inventaris cerdas dengan prediksi stok otomatis dan pencatatan transaksi real-time. Didesain khusus untuk efisiensi maksimal.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/login">
            <Button className="bg-blue-600 hover:bg-blue-700 h-14 px-10 text-lg font-bold shadow-xl shadow-blue-200 rounded-2xl gap-2">
              Mulai Sekarang <ArrowRight size={20} />
            </Button>
          </Link>
        </div>

        {/* FEATURE HIGHLIGHTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 max-w-5xl w-full">
          <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50/50 text-left">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <BarChart3 size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Analisis Penjualan</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Pantau omset dan produk terlaris dengan grafik interaktif yang mudah dipahami.</p>
          </div>

          <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50/50 text-left">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
              <Package size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Prediksi Stok</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Algoritma cerdas yang memberitahu kapan barang akan habis berdasarkan histori penjualan.</p>
          </div>

          <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50/50 text-left">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Akses Terkunci</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Data dilindungi dengan enkripsi JWT tingkat tinggi. Hanya kamu yang punya kuncinya.</p>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t py-12 text-center text-slate-400 text-xs font-medium">
        © 2026 STOKKU.id — Built with Love for Productivity.
      </footer>
    </div>
  );
}