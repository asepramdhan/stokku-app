const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// 1. Ambil semua transaksi penjualan (JOIN dengan produk dan toko)
router.get("/", async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1,
			limit = parseInt(req.query.limit) || 10,
			search = req.query.search || "",
			range = req.query.range || "all",
			store = req.query.store || "All",
			offset = (page - 1) * limit;

		// 1. Logika Filter Dinamis
		let whereClause = "WHERE (i.name LIKE ? OR st.name LIKE ?)",
			params = [`%${search}%`, `%${search}%`];

		if (range === "today")
			whereClause += " AND DATE(s.created_at) = DATE(NOW())";
		if (range === "week")
			whereClause += " AND YEARWEEK(s.created_at, 1) = YEARWEEK(NOW(), 1)";
		if (range === "month")
			whereClause +=
				" AND MONTH(s.created_at) = MONTH(NOW()) AND YEAR(s.created_at) = YEAR(NOW())";

		if (store !== "All") {
			whereClause += " AND st.name = ?";
			params.push(store);
		}

		// 2. Ambil Data Paginated
		const dataQuery = `
      SELECT s.*, i.name as product_name, i.sku, st.name as store_name, st.platform
      FROM sales s
      JOIN inventory i ON s.product_id = i.id
      JOIN stores st ON s.store_id = st.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
			[rows] = await db.query(dataQuery, [...params, limit, offset]),
			// 3. Ambil Global Stats (Hitung dari seluruh database yang ter-filter)
			[stats] = await db.query(
				`
      SELECT 
        SUM(total_price) as total_revenue, 
        SUM(qty) as total_qty, 
        COUNT(*) as transaction_count
      FROM sales s
      JOIN inventory i ON s.product_id = i.id
      JOIN stores st ON s.store_id = st.id
      ${whereClause}`,
				params,
			),
			// 4. Ambil total data terfilter (untuk pagination)
			[countRows] = await db.query(
				`
      SELECT COUNT(*) as total 
      FROM sales s 
      JOIN inventory i ON s.product_id = i.id 
      JOIN stores st ON s.store_id = st.id 
      ${whereClause}`,
				params,
			),
			totalFiltered = countRows[0].total;

		res.json({
			sales: rows,
			stats: {
				totalRevenue: stats[0].total_revenue || 0,
				totalQty: stats[0].total_qty || 0,
				transactionCount: stats[0].transaction_count || 0,
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

// Summary Hari Ini
router.get("/today-summary", async (req, res) => {
	try {
		const [rows] = await db.query(`
      SELECT 
        COALESCE(SUM(qty), 0) as total_qty, 
        COALESCE(SUM(qty * selling_price), 0) as total_sales 
      FROM sales 
      WHERE DATE(created_at) = CURDATE()
    `);

		// Kirim hasil baris pertama saja
		res.json(rows[0]);
	} catch (err) {
		console.error("Error Summary:", err);
		res.status(500).json({ error: err.message });
	}
});

// 2. Tambah Transaksi + Kurangi Stok
router.post("/", async (req, res) => {
	const { product_id, store_id, qty, selling_price } = req.body,
		total_price = qty * selling_price;

	try {
		// Jalankan Transaksi SQL
		await db.query("START TRANSACTION");

		// A. Simpan data penjualan
		const [result] = await db.execute(
			"INSERT INTO sales (product_id, store_id, qty, selling_price, total_price) VALUES (?, ?, ?, ?, ?)",
			[product_id, store_id, qty, selling_price, total_price],
		);

		// B. Kurangi stok di Master Produk
		await db.execute(
			"UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
			[qty, product_id],
		);

		await db.query("COMMIT");
		res.json({ id: result.insertId, ...req.body });
	} catch (err) {
		await db.query("ROLLBACK");
		res.status(500).json({ error: err.message });
	}
});

// Endpoint untuk Simpan Banyak Transaksi Sekaligus
router.post("/bulk", async (req, res) => {
	const { sales, store_id } = req.body; // sales adalah array transaksi

	if (!sales || sales.length === 0) {
		return res.status(400).json({ error: "Data transaksi kosong" });
	}

	try {
		await db.query("START TRANSACTION");

		for (const item of sales) {
			const { product_id, qty, selling_price } = item,
				total_price = qty * selling_price;

			// 1. Simpan Penjualan
			await db.execute(
				"INSERT INTO sales (product_id, store_id, qty, selling_price, total_price) VALUES (?, ?, ?, ?, ?)",
				[product_id, store_id, qty, selling_price, total_price],
			);

			// 2. Potong Stok
			await db.execute(
				"UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
				[qty, product_id],
			);
		}

		await db.query("COMMIT");
		res.json({ message: `${sales.length} Transaksi berhasil diproses!` });
	} catch (err) {
		await db.query("ROLLBACK");
		res.status(500).json({ error: err.message });
	}
});

// PUT: Edit Transaksi & Sesuaikan Stok
router.put("/:id", async (req, res) => {
	const { product_id, store_id, qty, selling_price } = req.body,
		total_price = qty * selling_price;

	try {
		await db.query("START TRANSACTION");

		// 1. Ambil Qty lama
		const [oldRows] = await db.query("SELECT qty FROM sales WHERE id = ?", [
				req.params.id,
			]),
			oldQty = oldRows[0].qty;

		// 2. Update data penjualan
		await db.execute(
			"UPDATE sales SET product_id=?, store_id=?, qty=?, selling_price=?, total_price=? WHERE id=?",
			[product_id, store_id, qty, selling_price, total_price, req.params.id],
		);

		// 3. Sesuaikan stok: Stok Baru = Stok Sekarang + (Qty Lama - Qty Baru)
		const diff = oldQty - qty;
		await db.execute(
			"UPDATE inventory SET quantity = quantity + ? WHERE id = ?",
			[diff, product_id],
		);

		await db.query("COMMIT");
		res.json({ message: "Transaksi diperbarui" });
	} catch (err) {
		await db.query("ROLLBACK");
		res.status(500).json({ error: err.message });
	}
});

// DELETE: Hapus Transaksi & Kembalikan Stok
router.delete("/:id", async (req, res) => {
	try {
		await db.query("START TRANSACTION");

		// 1. Ambil info Qty dan ProductID sebelum dihapus
		const [rows] = await db.query(
			"SELECT product_id, qty FROM sales WHERE id = ?",
			[req.params.id],
		);
		if (rows.length === 0)
			return res.status(404).json({ error: "Transaksi tidak ditemukan" });
		const { product_id, qty } = rows[0];

		// 2. Kembalikan stok ke inventory
		await db.execute(
			"UPDATE inventory SET quantity = quantity + ? WHERE id = ?",
			[qty, product_id],
		);

		// 3. Hapus data penjualan
		await db.execute("DELETE FROM sales WHERE id = ?", [req.params.id]);

		await db.query("COMMIT");
		res.json({ message: "Transaksi dihapus & stok dikembalikan" });
	} catch (err) {
		await db.query("ROLLBACK");
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
