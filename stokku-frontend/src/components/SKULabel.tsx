/* eslint-disable @typescript-eslint/no-explicit-any */
import QRCode from "react-qr-code";
import { forwardRef } from "react";

export const SKULabel = forwardRef<HTMLDivElement, { product: any }>(({ product }, ref) => {
  if (!product) return null;

  return (
    <div ref={ref} className="p-4 w-[250px] bg-white text-black border border-slate-200">
      <div className="flex flex-col items-center text-center space-y-2">
        <span className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-1 mb-1">
          STOKKU.ID PROPERTY
        </span>

        {/* QR Code */}
        <div className="bg-white p-1 border border-slate-100">
          <QRCode value={product.sku} size={80} />
        </div>

        <div className="space-y-0.5">
          <p className="text-sm font-black truncate w-full uppercase">{product.name}</p>
          <p className="text-[12px] font-mono font-bold text-blue-700">{product.sku}</p>
          <p className="text-[10px] font-bold text-slate-500 italic uppercase">{product.category}</p>
        </div>

        <div className="w-full border-t border-dashed border-slate-300 pt-1 mt-1">
          <p className="text-[9px] font-medium italic">Scan for inventory check</p>
        </div>
      </div>
    </div>
  );
});