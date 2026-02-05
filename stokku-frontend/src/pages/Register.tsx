/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' }),
    [loading, setLoading] = useState(false),
    navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (res.ok) {
        alert("Registrasi Berhasil! Silakan Login.");
        navigate("/login"); // Lempar ke halaman login
      } else {
        alert(data.message || "Registrasi Gagal!");
      }
    } catch (error) {
      console.error("DEBUG ERROR:", error); // 💡 Tambahkan ini biar kelihatan di Inspect Element (Console)
      alert("Terjadi kesalahan koneksi! Cek Console browser kamu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-600">STOKKU.id</h1>
            <p className="text-xs text-slate-500 font-medium">Buat akun baru kamu</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Nama Lengkap</p>
              <Input type="text" required placeholder="Jhon Doe" onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Email</p>
              <Input type="email" required placeholder="admin@stokku.id" onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Password</p>
              <Input type="password" required placeholder="******" onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Daftar Sekarang"}
            </Button>
            <p className="text-center text-[11px] text-slate-500">
              Sudah punya akun? <Link to="/login" className="text-blue-600 font-bold hover:underline">Masuk di sini</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}