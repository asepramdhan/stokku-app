import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Shopping from "./pages/Shopping";
import MasterProduct from "./pages/MasterProduct";
import Stores from "./pages/Stores";
import Sales from "./pages/Sales";
import Margin from "./pages/Margin";
import Login from "./pages/Login";
import { Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";

// 💡 INI MIDDLEWARE-NYA (Private Route)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("token"); // Ambil token dari storage

  if (!token) {
    // Kalau nggak ada token, tendang ke halaman login
    return <Navigate to="/login" replace />;
  }

  return children;
},

  // 💡 ANTI-BALIK LOGIC: Kalau sudah ada token, dilarang masuk ke Login/Register
  PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem("token");

    if (token) {
      // Kalau sudah login, paksa pindah ke halaman utama (dashboard)
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        {/* <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} /> */}

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
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