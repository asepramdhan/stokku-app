import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import MasterProduct from "./pages/MasterProduct";

// Placeholder Halaman (Nanti kita pecah ke file terpisah)
const Dashboard = () => <h1 className="text-2xl font-bold">Ringkasan Bisnis</h1>;
const Shopping = () => <h1 className="text-2xl font-bold">Daftar Belanja & Re-stok</h1>;
// const MasterProduct = () => <h1 className="text-2xl font-bold">Manajemen Master Produk</h1>;
const Stores = () => <h1 className="text-2xl font-bold">Pengaturan Toko</h1>;
const Sales = () => <h1 className="text-2xl font-bold">Transaksi Penjualan Online</h1>;
const Margin = () => <h1 className="text-2xl font-bold">Analisa Keuntungan (Margin)</h1>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="shopping" element={<Shopping />} />
          <Route path="master" element={<MasterProduct />} />
          <Route path="stores" element={<Stores />} />
          <Route path="sales" element={<Sales />} />
          <Route path="margin" element={<Margin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}