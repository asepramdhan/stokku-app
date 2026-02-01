const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// Ambil semua toko
router.get("/", async (req, res) => {
	try {
		const [rows] = await db.query("SELECT * FROM stores ORDER BY name ASC");
		res.json(rows);
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
