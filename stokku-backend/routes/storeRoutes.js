const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// Ambil semua toko dengan Pagination & Search
router.get("/", async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1,
			limit = parseInt(req.query.limit) || 10,
			search = req.query.search || "",
			platform = req.query.platform || "All",
			offset = (page - 1) * limit;

		// Build Query Filter
		let whereClause = "WHERE (name LIKE ? OR platform LIKE ?)",
			params = [`%${search}%`, `%${search}%`];

		if (platform !== "All") {
			whereClause += " AND platform = ?";
			params.push(platform);
		}

		// 1. Ambil Data Paginated
		const dataQuery = `SELECT * FROM stores ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`;
		const [rows] = await db.query(dataQuery, [...params, limit, offset]);

		// 2. Ambil Global Stats (Total, Online, Offline)
		const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_stores, 
        SUM(CASE WHEN platform != 'Offline / Fisik' AND platform != '' THEN 1 ELSE 0 END) as online_count,
        SUM(CASE WHEN platform = 'Offline / Fisik' THEN 1 ELSE 0 END) as offline_count
      FROM stores
    `);

		// 3. Ambil total data terfilter (untuk pagination)
		const [countRows] = await db.query(
			`SELECT COUNT(*) as total FROM stores ${whereClause}`,
			params,
		);
		const totalFiltered = countRows[0].total;

		res.json({
			stores: rows,
			stats: {
				totalStores: stats[0].total_stores || 0,
				onlineStores: stats[0].online_count || 0,
				offlineStores: stats[0].offline_count || 0,
			},
			pagination: {
				totalData: totalFiltered,
				totalPages: Math.ceil(totalFiltered / limit),
				currentPage: page,
			},
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Tambah toko baru
router.post("/", async (req, res) => {
	const { name, platform, admin_fee, extra_promo_fee, handling_fee } = req.body;
	try {
		const [result] = await db.execute(
			"INSERT INTO stores (name, platform, admin_fee, extra_promo_fee, handling_fee) VALUES (?, ?, ?, ?, ?)",
			[name, platform, admin_fee, extra_promo_fee, handling_fee],
		);
		res.json({
			id: result.insertId,
			name,
			platform,
			admin_fee,
			extra_promo_fee,
			handling_fee,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Update toko
router.put("/:id", async (req, res) => {
	const { name, platform, admin_fee, extra_promo_fee, handling_fee } = req.body;
	try {
		await db.execute(
			"UPDATE stores SET name=?, platform=?, admin_fee=?, extra_promo_fee=?, handling_fee=? WHERE id=?",
			[name, platform, admin_fee, extra_promo_fee, handling_fee, req.params.id],
		);
		res.json({ message: "Toko diperbarui" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Hapus toko
router.delete("/:id", async (req, res) => {
	try {
		await db.execute("DELETE FROM stores WHERE id=?", [req.params.id]);
		res.json({ message: "Toko dihapus" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
