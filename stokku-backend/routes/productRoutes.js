const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// Ambil semua produk
router.get("/", async (req, res) => {
	try {
		const [rows] = await db.query("SELECT * FROM inventory ORDER BY name ASC");
		res.json(rows);
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
