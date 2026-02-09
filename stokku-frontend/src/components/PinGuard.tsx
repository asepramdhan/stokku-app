/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function PinGuard({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [hasPin, setHasPin] = useState(true);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const token = localStorage.getItem("token");
  const pathname = window.location.pathname;
  const isPublicPage = pathname === "/" || pathname === "/login";

  // 1. LOGIKA CEK STATUS PIN (Saat Pertama Load)
  useEffect(() => {
    if (token && !isPublicPage) {
      checkPinStatus();
    } else {
      setIsLoading(false);
    }
  }, [pathname, token]);

  // 2. LOGIKA TIMER
  useEffect(() => {
    // Timer hanya jalan jika: User Login, Bukan Halaman Publik, dan Sedang TIDAK Terkunci
    if (!token || isPublicPage || isLocked) return;

    let timer: number;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      // Setel 5 menit (300.000 ms). Ubah ke 60000 jika ingin tes 1 menit saja.
      timer = setTimeout(() => {
        sessionStorage.removeItem("app_unlocked");
        setIsLocked(true);
        setPin(""); // Bersihkan input pin saat terkunci otomatis
      }, 300000);
    };

    // Daftar aktivitas yang dianggap "User masih aktif"
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    activityEvents.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer(); // Jalankan timer awal

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timer) clearTimeout(timer);
    };
  }, [isLocked, token, isPublicPage]); // Berjalan ulang jika status kunci berubah

  // 3. LOGIKA CEK STATUS PIN
  const checkPinStatus = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/check-pin`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();

      setHasPin(data.hasPin);

      const isUnlocked = sessionStorage.getItem("app_unlocked");
      if (!isUnlocked || !data.hasPin) {
        setIsLocked(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. LOGIKA SET PIN
  const handleAction = async () => {
    const endpoint = hasPin ? "/auth/verify-pin" : "/auth/set-pin";
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ pin })
      });

      if (res.ok) {
        sessionStorage.setItem("app_unlocked", "true");
        setIsLocked(false);
        setHasPin(true);
        setPin(""); // Bersihkan setelah berhasil
        toast.success(hasPin ? "Akses dibuka!" : "PIN Keamanan Berhasil Dibuat!");
      } else {
        toast.error(hasPin ? "PIN Salah!" : "Gagal menyimpan PIN");
      }
    } catch (error) { toast.error("Terjadi kesalahan sistem"); }
  };

  if (isPublicPage || !token) return <>{children}</>;
  if (isLoading) return null;

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center w-full max-w-sm text-slate-900">
          <div className={`p-4 rounded-full mb-4 ${hasPin ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
            {hasPin ? <Lock size={32} /> : <ShieldCheck size={32} />}
          </div>

          <h2 className="text-xl font-black mb-1">
            {hasPin ? "Aplikasi Terkunci" : "Setel PIN Keamanan"}
          </h2>
          <p className="text-xs text-slate-400 mb-6 text-center">
            {hasPin
              ? "Masukkan PIN 6 digit Anda untuk melanjutkan."
              : "Buat 6 digit PIN untuk mengunci aplikasi saat Anda pergi."}
          </p>

          <Input
            type="password"
            maxLength={6}
            placeholder="******"
            className="text-center text-2xl tracking-[0.5em] mb-4 h-14 font-black border-2 focus:border-blue-500"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAction()}
          />

          <Button onClick={handleAction} className={`w-full h-12 font-bold ${hasPin ? "bg-blue-600" : "bg-green-600"}`}>
            {hasPin ? "Buka Kunci" : "Simpan & Buka Aplikasi"}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}