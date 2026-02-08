const express = require("express");
const router = express.Router();
const db = require("../config/db");
// const auth = require("../middleware/auth"); // Aktifkan jika sudah ada middleware auth

// GET ALL RECORDS + STATS
router.get("/", async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;
		const search = req.query.search || "";
		const status = req.query.status || "all";
		const type = req.query.type || "all";

		// 1. Query Dasar
		let query =
			"SELECT * FROM shop_records WHERE (toko_name LIKE ? OR customer_name LIKE ?)";
		let params = [`%${search}%`, `%${search}%`];

		if (status !== "all") {
			query += " AND status = ?";
			params.push(status);
		}
		if (type !== "all") {
			query += " AND payment_type = ?";
			params.push(type);
		}

		// 2. Ambil Data (dengan Limit untuk Pagination)
		const [rows] = await db.query(
			`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
			[...params, limit, offset],
		);

		// 3. Ambil Total Data (untuk Pagination)
		const [countRows] = await db.query(
			`SELECT COUNT(*) as total FROM shop_records WHERE (toko_name LIKE ? OR customer_name LIKE ?) ${status !== "all" ? "AND status = ?" : ""} ${type !== "all" ? "AND payment_type = ?" : ""}`,
			params,
		);
		const totalData = countRows[0].total;

		// 4. Hitung Statistik (Untuk Kartu di Atas)
		const [statsRows] = await db.query(`
      SELECT 
        SUM(total_price) as totalBill, 
        SUM(paid_amount) as totalPaid, 
        SUM(total_price - paid_amount) as totalDebt 
      FROM shop_records
    `);

		// 5. Kirim Respon (Sesuai format yang diminta Frontend)
		res.json({
			list: rows,
			pagination: {
				totalData: totalData,
				totalPages: Math.ceil(totalData / limit),
				currentPage: page,
			},
			stats: {
				totalBill: statsRows[0].totalBill || 0,
				totalPaid: statsRows[0].totalPaid || 0,
				totalDebt: statsRows[0].totalDebt || 0,
			},
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 2. CREATE NEW RECORD (Update: Catat DP ke History)
router.post("/", async (req, res) => {
	const {
		toko_name,
		customer_name,
		total_price,
		paid_amount,
		payment_type,
		due_date,
		notes,
	} = req.body;
	let status = "pending";
	if (parseFloat(paid_amount) >= parseFloat(total_price)) status = "paid";
	else if (parseFloat(paid_amount) > 0) status = "partial";

	try {
		const [result] = await db.execute(
			"INSERT INTO shop_records (toko_name, customer_name, total_price, paid_amount, payment_type, status, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			[
				toko_name,
				customer_name,
				total_price,
				paid_amount || 0,
				payment_type,
				status,
				due_date || null,
				notes || null,
			],
		);

		// JIKA ADA DP, MASUKKAN KE HISTORY
		if (parseFloat(paid_amount) > 0) {
			await db.execute(
				"INSERT INTO shop_payment_history (record_id, amount) VALUES (?, ?)",
				[result.insertId, paid_amount],
			);
		}

		res
			.status(201)
			.json({ id: result.insertId, message: "Record created successfully" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 3. UPDATE PAYMENT (Update: Catat Cicilan ke History)
router.patch("/:id/pay", async (req, res) => {
	const { amount } = req.body;
	const { id } = req.params;

	try {
		const [rows] = await db.query(
			"SELECT total_price, paid_amount FROM shop_records WHERE id = ?",
			[id],
		);
		if (rows.length === 0)
			return res.status(404).json({ message: "Data tidak ditemukan" });

		const newPaidAmount =
			parseFloat(rows[0].paid_amount || 0) + parseFloat(amount || 0);
		let newStatus =
			newPaidAmount >= parseFloat(rows[0].total_price) ? "paid" : "partial";

		// Update record utama
		await db.execute(
			"UPDATE shop_records SET paid_amount = ?, status = ? WHERE id = ?",
			[newPaidAmount, newStatus, id],
		);

		// MASUKKAN KE HISTORY
		await db.execute(
			"INSERT INTO shop_payment_history (record_id, amount) VALUES (?, ?)",
			[id, amount],
		);

		res.json({ success: true, message: "Pembayaran berhasil dicatat" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 4. DELETE RECORD
router.delete("/:id", async (req, res) => {
	try {
		await db.execute("DELETE FROM shop_records WHERE id = ?", [req.params.id]);
		res.json({ message: "Record deleted" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 5. UPDATE RECORD (EDIT TOTAL)
router.put("/:id", async (req, res) => {
	const {
		toko_name,
		customer_name,
		total_price,
		paid_amount,
		payment_type,
		due_date,
	} = req.body;
	const { id } = req.params;

	// Logic: Hitung ulang status berdasarkan data baru
	let status = "pending";
	if (parseFloat(paid_amount) >= parseFloat(total_price)) status = "paid";
	else if (parseFloat(paid_amount) > 0) status = "partial";

	// Handle due_date: Jika kosong, jadikan NULL agar MySQL tidak error
	const finalDate = due_date === "" ? null : due_date;

	try {
		await db.execute(
			"UPDATE shop_records SET toko_name=?, customer_name=?, total_price=?, paid_amount=?, payment_type=?, status=?, due_date=? WHERE id=?",
			[
				toko_name,
				customer_name,
				total_price,
				paid_amount,
				payment_type,
				status,
				finalDate,
				id,
			],
		);
		res.json({ message: "Record updated successfully" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 6. GET UNIFIED HISTORY (BELANJA & BAYAR)
router.get("/:id/history", async (req, res) => {
	const { id } = req.params;
	try {
		const query = `
      (SELECT id, 'payment' as type, amount, payment_date as date, 'Cicilan/Bayar' as notes 
       FROM shop_payment_history WHERE record_id = ?)
      UNION ALL
      (SELECT id, 'spending' as type, amount, spending_date as date, notes 
       FROM shop_spending_history WHERE record_id = ?)
      ORDER BY date DESC
    `;
		const [rows] = await db.query(query, [id, id]);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 7. TAMBAH BELANJA HARIAN (TOP-UP TAGIHAN)
router.patch("/:id/add-spending", async (req, res) => {
	const { amount, notes } = req.body;
	const { id } = req.params;

	try {
		// 1. Ambil data lama untuk kalkulasi
		const [rows] = await db.query(
			"SELECT total_price, paid_amount FROM shop_records WHERE id = ?",
			[id],
		);
		if (rows.length === 0)
			return res.status(404).json({ message: "Data tidak ditemukan" });

		const newTotalPrice =
			parseFloat(rows[0].total_price || 0) + parseFloat(amount || 0);

		// Hitung ulang status (kalau hutang nambah, status jadi partial lagi kecuali sudah terbayar semua)
		let newStatus = "partial";
		if (parseFloat(rows[0].paid_amount) >= newTotalPrice) newStatus = "paid";

		// 2. Update Tabel Utama
		await db.execute(
			"UPDATE shop_records SET total_price = ?, status = ? WHERE id = ?",
			[newTotalPrice, newStatus, id],
		);

		// 3. Catat ke Riwayat Belanja
		await db.execute(
			"INSERT INTO shop_spending_history (record_id, amount, notes) VALUES (?, ?, ?)",
			[id, amount, notes || "Belanja Stok"],
		);

		res.json({
			success: true,
			message: "Tagihan belanja berhasil ditambahkan",
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
