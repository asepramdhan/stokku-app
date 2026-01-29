/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Package } from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}/products`;

export default function MasterProduct() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const fetchProducts = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Gagal menyambung ke server");
      const data = await res.json();
      console.log("Data diterima:", data); // Lihat di console F12
      setProducts(data);
    } catch (error) {
      console.error("Error Nih:", error);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = products.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Master Produk</h1>
          <p className="text-slate-500 text-sm">Kelola semua database barang dagangan kamu.</p>
        </div>
        <Button className="gap-2">
          <Plus size={18} /> Tambah Produk
        </Button>
      </div>

      {/* STATS SINGKAT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Package /></div>
            <div>
              <p className="text-sm text-slate-500">Total Jenis Produk</p>
              <h3 className="text-xl font-bold">{products.length} Item</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
        <Input
          placeholder="Cari berdasarkan Nama atau SKU..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Stok Gudang</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs text-slate-500">{product.sku || '-'}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category || 'Umum'}</TableCell>
                <TableCell>
                  <span className={`font-bold ${product.quantity < 10 ? 'text-red-500' : 'text-slate-700'}`}>
                    {product.quantity}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}