/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function QRScanner({ onScanSuccess }: { onScanSuccess: (text: string) => void }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        onScanSuccess(decodedText); // Kirim hasil scan ke parent
        scanner.clear(); // Matikan kamera setelah sukses
      },
      (error) => {
        // Abaikan error scanning biasa (saat belum nemu QR)
        console.error(error);
      }
    );

    return () => {
      scanner.clear().catch(err => console.error("Failed to clear scanner", err));
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div id="reader" className="overflow-hidden rounded-xl border-2 border-dashed dark:border-slate-800"></div>
      <p className="text-[10px] text-center text-slate-400 uppercase font-black">Arahkan kamera ke QR Code Produk</p>
    </div>
  );
}