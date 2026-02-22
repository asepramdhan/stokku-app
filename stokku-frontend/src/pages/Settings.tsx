/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, ShieldCheck, KeyRound, Save } from "lucide-react";
import { toast } from "sonner";
import { useTitle } from "@/hooks/useTitle";

export default function Settings() {
  useTitle("Pengaturan");
  const [profile, setProfile] = useState({
    name: JSON.parse(localStorage.getItem("user") || "{}").name || "",
    email: JSON.parse(localStorage.getItem("user") || "{}").email || "",
  });

  const [pinData, setPinData] = useState({ oldPin: "", newPin: "", confirmPin: "" });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Kita panggil rute check-pin atau buat rute khusus profile
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setProfile({
          name: data.name,
          email: data.email
        });
      }
    } catch (error) {
      toast.error("Gagal mengambil data profil dari server");
    } finally {
      setLoading(false);
    }
  };

  // Fungsi Update Profil
  const handleUpdateProfile = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        toast.success("Profil berhasil diperbarui!");
        // Update data di localStorage agar nama di sidebar berubah
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...user, ...profile }));
      }
    } catch (error) { toast.error("Gagal update profil"); }
  };

  // Fungsi Ganti PIN
  const handleUpdatePin = async () => {
    if (pinData.newPin !== pinData.confirmPin) return toast.error("Konfirmasi PIN baru tidak cocok!");
    if (pinData.newPin.length !== 6) return toast.error("PIN harus 6 digit!");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/update-pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ oldPin: pinData.oldPin, newPin: pinData.newPin }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("PIN berhasil diganti!");
        setPinData({ oldPin: "", newPin: "", confirmPin: "" });
      } else { toast.error(data.error); }
    } catch (error) { toast.error("Terjadi kesalahan sistem"); }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Akun</h1>
        <p className="text-slate-500 text-sm">Kelola identitas profil dan keamanan PIN Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KARTU PROFIL */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User size={18} className="text-blue-600" /> Profil Pengguna
            </CardTitle>
            <CardDescription className="text-xs">Informasi dasar akun Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Nama Lengkap</p>
              <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Alamat Email</p>
              <Input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
            </div>
            <Button disabled={loading} onClick={handleUpdateProfile} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              <Save size={16} /> {loading ? "Sabar ya..." : "Simpan Perubahan"}
            </Button>
          </CardContent>
        </Card>

        {/* KARTU KEAMANAN PIN */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck size={18} className="text-green-600" /> Keamanan PIN
            </CardTitle>
            <CardDescription className="text-xs">Ganti 6 digit PIN keamanan Anda secara berkala.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">PIN Lama</p>
              <Input type="password" maxLength={6} value={pinData.oldPin} onChange={e => setPinData({ ...pinData, oldPin: e.target.value })} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">PIN Baru (6 Digit)</p>
              <Input type="password" maxLength={6} value={pinData.newPin} onChange={e => setPinData({ ...pinData, newPin: e.target.value })} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Konfirmasi PIN Baru</p>
              <Input type="password" maxLength={6} value={pinData.confirmPin} onChange={e => setPinData({ ...pinData, confirmPin: e.target.value })} />
            </div>
            <Button onClick={handleUpdatePin} variant="outline" className="w-full border-green-200 text-green-600 hover:bg-green-50 gap-2">
              <KeyRound size={16} /> Ganti PIN Sekarang
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}