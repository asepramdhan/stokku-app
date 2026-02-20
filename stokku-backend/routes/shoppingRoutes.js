const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// Ambil Daftar Belanja dengan Pagination & Filter
router.get("/", async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1,
			limit = parseInt(req.query.limit) || 10,
			search = req.query.search || "",
			status = req.query.status || "All",
			category = req.query.category || "All",
			payment_type = req.query.payment_type || "All",
			offset = (page - 1) * limit;

		// Build Query Filter
		let whereClause = "WHERE (i.name LIKE ? OR i.sku LIKE ?)",
			params = [`%${search}%`, `%${search}%`];

		if (status !== "All") {
			whereClause += " AND sl.status = ?";
			params.push(status);
		}

		if (category !== "All") {
			whereClause += " AND i.category = ?";
			params.push(category);
		}

		if (payment_type !== "All") {
			whereClause += " AND sl.payment_type = ?";
			params.push(payment_type);
		}

		// 1. Ambil Data Paginated
		const dataQuery = `
      SELECT sl.*, i.name as product_name, i.sku, i.category 
      FROM shopping_list sl 
      JOIN inventory i ON sl.product_id = i.id 
      ${whereClause} 
      ORDER BY sl.status ASC, sl.created_at DESC 
      LIMIT ? OFFSET ?`,
			[rows] = await db.query(dataQuery, [...params, limit, offset]),
			// 2. Ambil Global Stats (Untuk Card Statistik di atas)
			// Hitung total pending dan estimasi harga dari seluruh data (bukan cuma yang di-limit)
			[stats] = await db.query(
				`
  SELECT 
    COUNT(*) as total_all,
    SUM(CASE WHEN sl.status = 'pending' THEN 1 ELSE 0 END) as total_pending,
    SUM(CASE WHEN sl.status = 'completed' THEN 1 ELSE 0 END) as total_completed,
    SUM(CASE WHEN sl.status = 'pending' THEN sl.qty * sl.buy_price ELSE 0 END) as estimated_spending
  FROM shopping_list sl
  JOIN inventory i ON sl.product_id = i.id 
  ${whereClause}
`,
				params,
			),
			// 3. Ambil total data yang terfilter (untuk info pagination)
			[countRows] = await db.query(
				`
      SELECT COUNT(*) as total 
      FROM shopping_list sl 
      JOIN inventory i ON sl.product_id = i.id 
      ${whereClause}`,
				params,
			),
			totalFiltered = countRows[0].total;

		res.json({
			list: rows,
			stats: {
				totalAll: stats[0].total_all || 0,
				totalPending: stats[0].total_pending || 0,
				totalCompleted: stats[0].total_completed || 0,
				estimatedSpending: stats[0].estimated_spending || 0,
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

// Endpoint untuk ambil harga beli terakhir
router.get("/last-price/:productId", async (req, res) => {
	try {
		const [rows] = await db.query(
			`SELECT buy_price FROM shopping_list 
       WHERE product_id = ? AND status = 'completed' 
       ORDER BY created_at DESC LIMIT 1`,
			[req.params.productId],
		);

		if (rows.length > 0) {
			res.json({ last_price: rows[0].buy_price });
		} else {
			// Jika belum pernah beli, ambil harga modal awal dari inventory
			const [product] = await db.query(
				"SELECT avg_cost FROM inventory WHERE id = ?",
				[req.params.productId],
			);
			res.json({ last_price: product[0]?.avg_cost || 0 });
		}
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Tambah Rencana Belanja
router.post("/", async (req, res) => {
	// Pastikan ambil data dengan default value jika undefined
	const product_id = req.body.product_id || null,
		qty = req.body.qty || 1,
		buy_price = req.body.buy_price || 0,
		payment_type = req.body.payment_type || "cash";

	if (!product_id) {
		return res.status(400).json({ error: "Product ID tidak ditemukan!" });
	}

	try {
		// Cek dulu: apakah barang ini sudah ada di daftar belanja yang statusnya 'pending'?
		const [existing] = await db.query(
			"SELECT id FROM shopping_list WHERE product_id = ? AND status = 'pending'",
			[product_id],
		);

		if (existing.length > 0) {
			return res
				.status(400)
				.json({ error: "Barang sudah ada di daftar belanja!" });
		}

		const [result] = await db.execute(
			"INSERT INTO shopping_list (product_id, qty, buy_price, payment_type) VALUES (?, ?, ?, ?)",
			[product_id, qty, buy_price, payment_type],
		);
		res.json({ id: result.insertId, ...req.body });
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

// PROSES BULK COMPLETE: Update Status + Hitung Moving Average untuk banyak barang
router.post("/complete-bulk", async (req, res) => {
	const { ids } = req.body; // Menerima array [1, 2, 3]

	if (!ids || ids.length === 0)
		return res.status(400).json({ error: "Tidak ada data dipilih" });

	try {
		await db.query("START TRANSACTION");

		for (const id of ids) {
			// 1. Ambil data belanja
			const [orders] = await db.query(
					"SELECT * FROM shopping_list WHERE id = ?",
					[id],
				),
				order = orders[0];

			if (order && order.status === "pending") {
				// 2. Ambil data produk
				const [products] = await db.query(
						"SELECT quantity, avg_cost FROM inventory WHERE id = ?",
						[order.product_id],
					),
					product = products[0],
					// 3. Hitung Moving Average
					currentQty = Number(product.quantity),
					currentAvgCost = Number(product.avg_cost || 0),
					newQty = Number(order.qty),
					newBuyPrice = Number(order.buy_price),
					totalQty = currentQty + newQty,
					newAvgCost =
						(currentQty * currentAvgCost + newQty * newBuyPrice) / totalQty;

				// 4. Update Inventory & Shopping List
				await db.execute(
					"UPDATE inventory SET quantity = ?, avg_cost = ? WHERE id = ?",
					[totalQty, newAvgCost, order.product_id],
				);
				await db.execute(
					"UPDATE shopping_list SET status = 'completed' WHERE id = ?",
					[id],
				);
			}
		}

		await db.query("COMMIT");
		res.json({ message: `${ids.length} barang berhasil masuk gudang` });
	} catch (err) {
		await db.query("ROLLBACK");
		res.status(500).json({ error: err.message });
	}
});

// Tambah Banyak Barang ke Rencana Belanja Sekaligus (di Bell lonceng)
router.post("/add-bulk", async (req, res) => {
	const { productIds } = req.body; // Array [101, 102, 105]

	if (!productIds || productIds.length === 0) {
		return res.status(400).json({ error: "Tidak ada produk dipilih" });
	}

	try {
		await db.query("START TRANSACTION");

		for (const pId of productIds) {
			// 1. Cek apakah sudah ada di daftar belanja (pending)
			const [existing] = await db.query(
				"SELECT id FROM shopping_list WHERE product_id = ? AND status = 'pending'",
				[pId],
			);

			if (existing.length === 0) {
				// 2. Cari harga terakhir
				const [lastPriceRows] = await db.query(
					`SELECT buy_price FROM shopping_list 
           WHERE product_id = ? AND status = 'completed' 
           ORDER BY created_at DESC LIMIT 1`,
					[pId],
				);

				let price = 0;
				if (lastPriceRows.length > 0) {
					price = lastPriceRows[0].buy_price;
				} else {
					const [prod] = await db.query(
						"SELECT avg_cost FROM inventory WHERE id = ?",
						[pId],
					);
					price = prod[0]?.avg_cost || 0;
				}

				// 3. Masukkan ke daftar belanja
				await db.execute(
					"INSERT INTO shopping_list (product_id, qty, buy_price, payment_type) VALUES (?, ?, ?, 'cash')",
					[pId, 1, price],
				);
			}
		}

		await db.query("COMMIT");
		res.json({ message: "Semua barang berhasil masuk rencana belanja" });
	} catch (err) {
		await db.query("ROLLBACK");
		res.status(500).json({ error: err.message });
	}
});

// Edit Rencana Belanja (Hanya untuk yang statusnya pending)
router.put("/:id", async (req, res) => {
	const { qty, buy_price, payment_type } = req.body;
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
			"UPDATE shopping_list SET qty = ?, buy_price = ?, payment_type = ? WHERE id = ?",
			[qty, buy_price, payment_type, req.params.id],
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

module.exports = router;
