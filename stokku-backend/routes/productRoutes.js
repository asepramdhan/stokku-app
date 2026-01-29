const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Ambil semua produk
router.get("/", async (req, res) => {
	try {
		const [rows] = await db.query("SELECT * FROM inventory ORDER BY name ASC");
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
