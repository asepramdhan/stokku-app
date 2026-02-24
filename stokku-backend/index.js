require("dotenv").config();
const express = require("express"),
	cors = require("cors"),
	app = express(),
	// Routes
	authRoutes = require("./routes/authRoutes"),
	authMiddleware = require("./middleware/auth"),
	dashboardRoutes = require("./routes/dashboardRoutes"),
	shoppingRoutes = require("./routes/shoppingRoutes"),
	productRoutes = require("./routes/productRoutes"),
	storeRoutes = require("./routes/storeRoutes"),
	salesRoutes = require("./routes/salesRoutes"),
	marginRoutes = require("./routes/marginRoutes"),
	recordRoutes = require("./routes/recordRoutes"),
	PORT = process.env.PORT || 5001;

// --- 1. MIDDLEWARE CORS (DI TARUH PALING ATAS) ---
app.use(
	cors({
		origin: ["http://localhost:5173", "https://stokku.portoku.id"],
		// FIX: Tambahkan OPTIONS di methods
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		// FIX: Tambahkan allowedHeaders secara eksplisit
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"Accept",
			"X-Requested-With",
		],
		credentials: true,
	}),
);

// --- 2. JURUS PENJINAK OPTIONS (PENTING!) ---
// Ini gunanya mencegat request OPTIONS sebelum kena cek express.json()
app.options("*", cors());

// --- 3. BARU BODY PARSER ---
app.use(express.json());

// Pakai Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/shopping", shoppingRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/margin", marginRoutes);
app.use("/api/records", recordRoutes);

// Listen Server
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
