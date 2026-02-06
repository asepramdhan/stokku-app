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

// app.get("/api/tes", (req, res) => {
// 	res.json({
// 		message: "Jalur API Aman!",
// 		status: "Online",
// 		time: new Date(),
// 	});
// });

// // Rute Tes Koneksi Database
// app.get("/api/debug-db", async (req, res) => {
// 	const mysql = require("mysql2/promise");

// 	const config = {
// 		host: process.env.DB_HOST || "127.0.0.1",
// 		user: process.env.DB_USER,
// 		password: process.env.DB_PASS,
// 		database: process.env.DB_NAME,
// 		connectTimeout: 5000, // Berhenti mencoba setelah 5 detik (biar gak pending selamanya)
// 	};

// 	try {
// 		const connection = await mysql.createConnection(config);
// 		const [rows] = await connection.execute(
// 			"SELECT 'Koneksi Berhasil!' as status",
// 		);
// 		await connection.end();

// 		res.json({
// 			success: true,
// 			message: rows[0].status,
// 			cek_variabel: {
// 				host: config.host,
// 				user: config.user,
// 				database: config.database,
// 				password_terisi: config.password
// 					? "Ya (Sudah Terisi)"
// 					: "Tidak (Kosong!)",
// 			},
// 		});
// 	} catch (err) {
// 		res.status(500).json({
// 			success: false,
// 			error_code: err.code,
// 			error_message: err.message,
// 			saran:
// 				"Pastikan User sudah di-Add ke Database di menu MySQL Databases cPanel dan Privileges dicentang ALL.",
// 		});
// 	}
// });

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
