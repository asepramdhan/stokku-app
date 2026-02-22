import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTitle } from "@/hooks/useTitle";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function Login() {
  useTitle("Login");
  const [form, setForm] = useState({ email: '', password: '' }),
    [loading, setLoading] = useState(false),

    // Fungsi login
    handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        }),
          data = await res.json();

        if (res.ok) {
          localStorage.setItem("token", data.token); // Simpan kunci masuk
          // 💡 SIMPAN DATA USER JUGA
          localStorage.setItem("user_name", data.user.name);
          localStorage.setItem("user_email", data.user.email);

          window.location.href = "/dashboard"; // Lempar ke halaman dashboard
        } else {
          alert(data.message || "Login Gagal!");
        }
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
            <p className="text-xs text-slate-500 font-medium">Silakan masuk ke akun kamu</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Email</p>
              <Input type="email" required onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Password</p>
              <Input type="password" required onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Masuk Sekarang"}
            </Button>
            {/* <p className="text-center text-[11px] text-slate-500">
              Belum punya akun? <Link to="/register" className="text-blue-600 font-bold hover:underline">Daftar disini</Link>
            </p> */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}