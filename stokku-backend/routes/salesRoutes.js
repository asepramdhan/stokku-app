const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// 1. Ambil semua transaksi penjualan (JOIN dengan produk dan toko)
router.get("/", async (req, res) => {
	const { range } = req.query;

	// Logika Filter Tanggal
	let dateFilter = "WHERE 1=1";
	if (range === "today") dateFilter = "WHERE DATE(s.created_at) = DATE(NOW())";
	if (range === "week")
		dateFilter = "WHERE YEARWEEK(s.created_at, 1) = YEARWEEK(NOW(), 1)";
	if (range === "month")
		dateFilter =
			"WHERE MONTH(s.created_at) = MONTH(NOW()) AND YEAR(s.created_at) = YEAR(NOW())";

	try {
		const query = `
      SELECT s.*, i.name as product_name, i.sku, st.name as store_name, st.platform
      FROM sales s
      JOIN inventory i ON s.product_id = i.id
      JOIN stores st ON s.store_id = st.id
      ${dateFilter}
      ORDER BY s.created_at DESC`,
			[rows] = await db.query(query);
		res.json(rows);
	} catch (err) {
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
