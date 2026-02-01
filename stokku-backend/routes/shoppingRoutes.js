const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// Ambil Daftar Belanja - Tambahkan i.category
router.get("/", async (req, res) => {
	try {
		const query = `
      SELECT sl.*, i.name as product_name, i.sku, i.category 
      FROM shopping_list sl 
      JOIN inventory i ON sl.product_id = i.id 
      ORDER BY sl.status ASC, sl.created_at DESC`,
			[rows] = await db.query(query);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Tambah Rencana Belanja
router.post("/", async (req, res) => {
	const { product_id, qty, buy_price } = req.body;
	try {
		const [result] = await db.execute(
			"INSERT INTO shopping_list (product_id, qty, buy_price) VALUES (?, ?, ?)",
			[product_id, qty, buy_price],
		);
		res.json({ id: result.insertId, ...req.body });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Edit Rencana Belanja (Hanya untuk yang statusnya pending)
router.put("/:id", async (req, res) => {
	const { qty, buy_price } = req.body;
	try {
		const [rows] = await db.query(
			"SELECT status FROM shopping_list WHERE id = ?",
			[req.params.id],
		);
		if (rows[0].status === "completed") {
			return res
				.status(400)
				.json({ error: "Data yang sudah selesai tidak bisa diubah" });
		}

		await db.execute(
			"UPDATE shopping_list SET qty = ?, buy_price = ? WHERE id = ?",
			[qty, buy_price, req.params.id],
		);
		res.json({ message: "Rencana belanja diperbarui" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Hapus Rencana Belanja
router.delete("/:id", async (req, res) => {
	try {
		await db.execute("DELETE FROM shopping_list WHERE id = ?", [req.params.id]);
		res.json({ message: "Rencana belanja dihapus" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// PROSES CEKLIS: Update Status + Hitung Moving Average di Inventory
router.post("/complete/:id", async (req, res) => {
	const shoppingId = req.params.id;
	try {
		await db.query("START TRANSACTION");

		const [orders] = await db.query(
				"SELECT * FROM shopping_list WHERE id = ?",
				[shoppingId],
			),
			order = orders[0];
		if (!order || order.status === "completed")
			throw new Error("Data tidak valid");

		const [products] = await db.query(
				"SELECT quantity, avg_cost FROM inventory WHERE id = ?",
				[order.product_id],
			),
			product = products[0];

		// Logika Moving Average
		const currentQty = Number(product.quantity),
			currentAvgCost = Number(product.avg_cost || 0),
			newQty = Number(order.qty),
			newBuyPrice = Number(order.buy_price),
			totalQty = currentQty + newQty,
			newAvgCost =
				(currentQty * currentAvgCost + newQty * newBuyPrice) / totalQty;

		// Update Master Produk
		await db.execute(
			"UPDATE inventory SET quantity = ?, avg_cost = ? WHERE id = ?",
			[totalQty, newAvgCost, order.product_id],
		);
		// Update Status Belanja
		await db.execute(
			"UPDATE shopping_list SET status = 'completed' WHERE id = ?",
			[shoppingId],
		);

		await db.query("COMMIT");
		res.json({ message: "Stok & Modal berhasil diperbarui" });
	} catch (err) {
		await db.query("ROLLBACK");
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
