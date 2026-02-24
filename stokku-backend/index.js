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
	// Port Server

	PORT = process.env.PORT || 5001;

// Middleware Global

app.use(
	cors({
		origin: ["http://localhost:5173", "https://stokku.portoku.id"], // Izinkan local dan hosting

		methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // <--- PASTIKAN PATCH ADA DI SINI

		credentials: true,
	}),
);

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
