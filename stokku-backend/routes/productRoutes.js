const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// Ambil produk dengan Pagination & Search + Prediksi Stok
router.get("/", async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1,
			limit = parseInt(req.query.limit) || 10,
			search = req.query.search || "",
			category = req.query.category || "All",
			offset = (page - 1) * limit;

		// Build Query Filter
		let whereClause = "WHERE (i.name LIKE ? OR i.sku LIKE ?)",
			params = [`%${search}%`, `%${search}%`];

		if (category !== "All") {
			whereClause += " AND i.category = ?";
			params.push(category);
		}

		// 1. Ambil Data Paginated + Hitung ADS (Average Daily Sales) 30 Hari Terakhir
		const dataQuery = `
      SELECT 
        i.*, 
        COALESCE(s.total_sales, 0) / 30 as ads
      FROM inventory i
      LEFT JOIN (
        SELECT product_id, SUM(qty) as total_sales 
        FROM sales 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY product_id
      ) s ON i.id = s.product_id
      ${whereClause} 
      ORDER BY i.name ASC 
      LIMIT ? OFFSET ?`,
			[rows] = await db.query(dataQuery, [...params, limit, offset]),
			// Tambahkan kalkulasi daysLeft di level JavaScript
			productsWithPrediction = rows.map((item) => {
				const dailySpeed =
						parseFloat(item.ads) > 0 ? parseFloat(item.ads) : 0.05, // Cadangan jika 0
					daysLeft = Math.floor(item.quantity / dailySpeed);
				return { ...item, daysLeft };
			}),
			// 2. Ambil Global Stats
			[stats] = await db.query(`
      SELECT 
        COUNT(*) as total_items, 
        SUM(quantity) as total_stock,
        SUM(CASE WHEN quantity < 10 THEN 1 ELSE 0 END) as low_stock_count
      FROM inventory
    `),
			// 3. Ambil total data yang terfilter
			[countRows] = await db.query(
				`SELECT COUNT(*) as total FROM inventory i ${whereClause}`,
				params,
			),
			totalFiltered = countRows[0].total;

		res.json({
			products: productsWithPrediction, // Kirim data yang sudah ada daysLeft
			stats: {
				totalItems: stats[0].total_items || 0,
				totalStock: stats[0].total_stock || 0,
				lowStock: stats[0].low_stock_count || 0,
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

// Endpoint Pencarian Produk Ringan (untuk Auto-complete)
router.get("/search-suggest", async (req, res) => {
	const { q } = req.query; // q adalah kata kunci pencarian
	try {
		const query = `
      SELECT id, name, sku, quantity, avg_cost 
      FROM inventory 
      WHERE name LIKE ? OR sku LIKE ? 
      LIMIT 10`, // Batasi 10 saran saja agar cepat
			[rows] = await db.query(query, [`%${q}%`, `%${q}%`]);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Ambil History Produk
router.get("/history/:id", async (req, res) => {
	const productId = req.params.id;
	try {
		const query = `
      (SELECT 
        'MASUK' as type, 
        qty, 
        buy_price as price, 
        created_at, 
        'Kulakan / Restok' as note 
       FROM shopping_list 
       WHERE product_id = ? AND status = 'completed')

      UNION ALL

      (SELECT 
        'KELUAR' as type, 
        qty, 
        selling_price as price, 
        s.created_at, 
        st.name as note 
       FROM sales s
       JOIN stores st ON s.store_id = st.id
       WHERE s.product_id = ?)

			 UNION ALL

			 /* --- BAGIAN BARU: MENGAMBIL DATA OPNAME --- */
      (SELECT 
        CASE WHEN adjustment_qty > 0 THEN 'MASUK' ELSE 'KELUAR' END as type, 
        ABS(adjustment_qty) as qty, 
        0 as price, 
        created_at, 
        CONCAT('Opname: ', reason) as note 
       FROM stock_adjustments 
       WHERE product_id = ?)
      /* ------------------------------------------ */

      ORDER BY created_at DESC 
      LIMIT 50`,
			[rows] = await db.query(query, [productId, productId, productId]);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Endpoint untuk ambil rekomendasi restok
router.get("/restock-suggestions", async (req, res) => {
	try {
		const query = `
			SELECT 
				i.id, 
				i.name, 
				i.quantity as current_stock,
				(SELECT COALESCE(SUM(qty), 0) FROM sales WHERE product_id = i.id AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) / 30 as avg_daily_sales
			FROM inventory i
			WHERE i.quantity < 20 -- Hanya cek yang stoknya mulai menipis
		`,
			[rows] = await db.query(query),
			suggestions = rows.map((item) => {
				const ads = parseFloat(item.avg_daily_sales),
					// Jika tidak ada penjualan sama sekali, asumsikan laku 0.1 per hari agar tidak pembagian nol
					dailySpeed = ads > 0 ? ads : 0.01,
					daysLeft = Math.floor(item.current_stock / dailySpeed),
					// Hitung tanggal restok (Hari ini + Sisa Hari - 2 hari Lead Time/Pengiriman)
					restockDate = new Date();
				restockDate.setDate(restockDate.getDate() + (daysLeft - 2));

				return {
					...item,
					daysLeft,
					suggestedDate: restockDate,
					isUrgent: daysLeft <= 3,
				};
			});

		res.json(suggestions);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Tambah Produk Baru
router.post("/", async (req, res) => {
	const { sku, name, category, quantity, price } = req.body;
	try {
		// Kita tambahkan 'store' di query dan beri nilai 'Gudang Pusat' atau NULL
		const query =
			"INSERT INTO inventory (sku, name, category, quantity, price, store) VALUES (?, ?, ?, ?, ?, ?)";

		const [result] = await db.execute(query, [
			sku,
			name,
			category,
			quantity || 0,
			price || 0,
			"Gudang Pusat", // <--- Ini penawar errornya
		]);

		res.json({ id: result.insertId, ...req.body });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});

// Endpoint Stock Opname
router.post("/opname/:id", async (req, res) => {
	const productId = req.params.id;
	const { new_qty, reason } = req.body;

	try {
		await db.query("START TRANSACTION");

		// 1. Ambil stok lama
		const [rows] = await db.query(
			"SELECT quantity FROM inventory WHERE id = ?",
			[productId],
		);
		if (rows.length === 0) throw new Error("Produk tidak ditemukan");

		const oldQty = rows[0].quantity;
		const adjQty = new_qty - oldQty;

		// 2. Update stok di inventory
		await db.execute("UPDATE inventory SET quantity = ? WHERE id = ?", [
			new_qty,
			productId,
		]);

		// 3. Catat di tabel stock_adjustments
		await db.execute(
			"INSERT INTO stock_adjustments (product_id, old_qty, new_qty, adjustment_qty, reason) VALUES (?, ?, ?, ?, ?)",
			[productId, oldQty, new_qty, adjQty, reason || "Stock Opname"],
		);

		await db.query("COMMIT");
		res.json({
			message: "Stock opname berhasil diperbarui",
			adjustment: adjQty,
		});
	} catch (err) {
		await db.query("ROLLBACK");
		res.status(500).json({ error: err.message });
	}
});

// Update Produk
router.put("/:id", async (req, res) => {
	const { sku, name, category, price, quantity } = req.body;
	try {
		const query =
			"UPDATE inventory SET sku=?, name=?, category=?, price=?, quantity=? WHERE id=?";
		await db.execute(query, [
			sku,
			name,
			category,
			price,
			quantity,
			req.params.id,
		]);
		res.json({ message: "Produk diperbarui" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Hapus Produk
router.delete("/:id", async (req, res) => {
	try {
		await db.execute("DELETE FROM inventory WHERE id = ?", [req.params.id]);
		res.json({ message: "Produk dihapus" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
