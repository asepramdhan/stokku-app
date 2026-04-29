const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// Ambil Margin dengan Pagination & Filter
router.get("/", async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1,
			limit = parseInt(req.query.limit) || 10,
			search = req.query.search || "",
			range = req.query.range || "all",
			store = req.query.store || "All",
			offset = (page - 1) * limit;

		// 1. Filter Logic
		let whereClause = "WHERE (i.name LIKE ? OR st.name LIKE ?)",
			params = [`%${search}%`, `%${search}%`];

		if (range === "today")
			whereClause += " AND DATE(s.created_at) = DATE(NOW())";
		if (range === "yesterday")
			whereClause += " AND DATE(s.created_at) = DATE(NOW() - INTERVAL 1 DAY)";
		if (range === "week")
			whereClause += " AND YEARWEEK(s.created_at, 1) = YEARWEEK(NOW(), 1)";
		if (range === "month")
			whereClause +=
				" AND MONTH(s.created_at) = MONTH(NOW()) AND YEAR(s.created_at) = YEAR(NOW())";

		if (store !== "All") {
			whereClause += " AND st.name = ?";
			params.push(store);
		}

		// 2. Query Utama dengan Kalkulasi Margin di SQL
		const dataQuery = `
      SELECT 
        s.id, s.qty, s.selling_price, s.total_price, s.created_at,
        i.name as product_name, i.avg_cost as capital,
        st.name as store_name, st.platform, st.admin_fee, st.extra_promo_fee, st.handling_fee,
        -- Kalkulasi Biaya & Profit
        ((s.total_price * st.admin_fee / 100) + (s.total_price * st.extra_promo_fee / 100) + st.handling_fee) as total_fees,
        (s.total_price - (s.qty * i.avg_cost) - ((s.total_price * st.admin_fee / 100) + (s.total_price * st.extra_promo_fee / 100) + st.handling_fee)) as net_profit
      FROM sales s
      JOIN inventory i ON s.product_id = i.id
      JOIN stores st ON s.store_id = st.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
			[rows] = await db.query(dataQuery, [...params, limit, offset]);
		// ============================================================
		// --- 3. MULAI MASUKKAN KODE BARU DI SINI (LOGIKA IKLAN) ---
		// ============================================================
		let adWhere = "WHERE 1=1",
			adParams = [];
		if (range === "today") adWhere += " AND DATE(date) = DATE(NOW())";
		if (range === "yesterday")
			adWhere += " AND DATE(date) = DATE(NOW() - INTERVAL 1 DAY)";
		if (range === "week")
			adWhere += " AND YEARWEEK(date, 1) = YEARWEEK(NOW(), 1)";
		if (range === "month")
			adWhere += " AND MONTH(date) = MONTH(NOW()) AND YEAR(date) = YEAR(NOW())";

		if (store !== "All") {
			// Cari ID toko untuk filter iklan
			const [stRow] = await db.query("SELECT id FROM stores WHERE name = ?", [
				store,
			]);
			if (stRow.length > 0) {
				adWhere += " AND store_id = ?";
				adParams.push(stRow[0].id);
			}
		}

		const [adStats] = await db.query(
			`SELECT SUM(amount) as total_ads FROM ads ${adWhere}`,
			adParams,
		);
		const totalAds = adStats[0].total_ads || 0;

		// --- 4. HITUNG STATS SALES (Update query ini) ---
		const [stats] = await db.query(
			`SELECT 
				SUM(s.total_price) as total_revenue, 
				SUM(s.qty * i.avg_cost) as total_cogs, -- Tambahkan ini untuk Modal Produk
				SUM(s.total_price - (s.qty * i.avg_cost) - ((s.total_price * st.admin_fee / 100) + (s.total_price * st.extra_promo_fee / 100) + st.handling_fee)) as total_net_profit 
			FROM sales s 
			JOIN inventory i ON s.product_id = i.id 
			JOIN stores st ON s.store_id = st.id 
			${whereClause}`,
			params,
		);

		const revenue = stats[0].total_revenue || 0;
		const totalCogs = stats[0].total_cogs || 0; // Ambil nilai modal produk
		// VARIABEL INI YANG PENTING: Profit Sales dikurangi Iklan
		const netProfit = (stats[0].total_net_profit || 0) - totalAds;
		// ============================================================
		// 4. Count for Pagination
		const [countRows] = await db.query(
			`
      SELECT COUNT(*) as total FROM sales s JOIN inventory i ON s.product_id = i.id JOIN stores st ON s.store_id = st.id ${whereClause}`,
			params,
		);

		// 5. Ambil Top 3 Produk Paling Untung (Disesuaikan dengan filter)
		const topQuery = `
      SELECT 
        i.name as product_name,
        SUM(s.total_price - (s.qty * i.avg_cost) - ((s.total_price * st.admin_fee / 100) + (s.total_price * st.extra_promo_fee / 100) + st.handling_fee)) as total_net_profit
      FROM sales s
      JOIN inventory i ON s.product_id = i.id
      JOIN stores st ON s.store_id = st.id
      ${whereClause}
      GROUP BY s.product_id
      ORDER BY total_net_profit DESC
      LIMIT 3`;

		const [topProducts] = await db.query(topQuery, params);

		res.json({
			list: rows,
			topProducts: topProducts,
			stats: {
				totalRevenue: revenue,
				totalCost: totalCogs, // <--- Masukkan ke dalam response stats
				totalNetProfit: netProfit,
				avgMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
			},
			pagination: {
				totalData: countRows[0].total,
				totalPages: Math.ceil(countRows[0].total / limit),
				currentPage: page,
			},
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Update Riwayat Iklan dengan Pagination
router.get("/ads-list", async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1,
			limit = 5, // Tampilkan 5 data per halaman
			offset = (page - 1) * limit,
			{ range, store } = req.query;

		let adWhere = "WHERE 1=1",
			adParams = [];

		if (range === "today") adWhere += " AND DATE(a.date) = DATE(NOW())";
		if (range === "yesterday")
			adWhere += " AND DATE(a.date) = DATE(NOW() - INTERVAL 1 DAY)";
		if (range === "week")
			adWhere += " AND YEARWEEK(a.date, 1) = YEARWEEK(NOW(), 1)";
		if (range === "month")
			adWhere +=
				" AND MONTH(a.date) = MONTH(NOW()) AND YEAR(a.date) = YEAR(NOW())";

		if (store !== "All") {
			adWhere += " AND st.name = ?";
			adParams.push(store);
		}

		// QUERY 1: Ambil Data Paginated
		const [ads] = await db.query(
			`SELECT a.*, st.name as store_name FROM ads a JOIN stores st ON a.store_id = st.id ${adWhere} ORDER BY a.date DESC LIMIT ? OFFSET ?`,
			[...adParams, limit, offset],
		);

		// QUERY 2: Hitung Total Baris & TOTAL NOMINAL (SUM)
		const [stats] = await db.query(
			`SELECT COUNT(*) as total, SUM(a.amount) as totalAmount FROM ads a JOIN stores st ON a.store_id = st.id ${adWhere}`,
			adParams,
		);

		res.json({
			list: ads,
			totalPages: Math.ceil(stats[0].total / limit),
			totalData: stats[0].total,
			totalAmount: stats[0].totalAmount || 0, // <--- Kirim ini ke Frontend
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// --- 1. SIMPAN BIAYA IKLAN (ADS) ---
router.post("/ads", async (req, res) => {
	try {
		const { store_id, amount, date, note } = req.body;
		await db.query(
			"INSERT INTO ads (store_id, amount, date, notes) VALUES (?, ?, ?, ?)",
			[store_id, amount, date, note],
		);
		res.json({ success: true, message: "Biaya iklan berhasil dicatat!" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Update Data Iklan
router.put("/ads/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { store_id, amount, date, notes } = req.body;
		await db.query(
			"UPDATE ads SET store_id = ?, amount = ?, date = ?, notes = ? WHERE id = ?",
			[store_id, amount, date, notes, id],
		);
		res.json({ success: true, message: "Data iklan berhasil diperbarui!" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Hapus Data Iklan
router.delete("/ads/:id", async (req, res) => {
	try {
		const { id } = req.params;
		await db.query("DELETE FROM ads WHERE id = ?", [id]);
		res.json({ success: true, message: "Data iklan berhasil dihapus!" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
