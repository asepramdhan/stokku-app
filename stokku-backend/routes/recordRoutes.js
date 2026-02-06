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

// 2. CREATE NEW RECORD (FIXED)
router.post("/", async (req, res) => {
	const {
		toko_name,
		customer_name,
		total_price,
		paid_amount,
		payment_type,
		due_date,
		notes, // Ini yang sering undefined
	} = req.body;

	// Logic status
	let status = "pending";
	if (parseFloat(paid_amount) >= parseFloat(total_price)) status = "paid";
	else if (parseFloat(paid_amount) > 0) status = "partial";

	// PROTEKSI: Paksa undefined menjadi null agar MySQL tidak error
	const finalDueDate = due_date === "" || !due_date ? null : due_date;
	const finalNotes = notes === undefined || notes === "" ? null : notes;

	try {
		const [result] = await db.execute(
			"INSERT INTO shop_records (toko_name, customer_name, total_price, paid_amount, payment_type, status, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			[
				toko_name || null,
				customer_name || null,
				total_price || 0,
				paid_amount || 0,
				payment_type || "weekly",
				status,
				finalDueDate,
				finalNotes,
			],
		);
		res
			.status(201)
			.json({ id: result.insertId, message: "Record created successfully" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 3. UPDATE PAYMENT (Sistem Cicilan)
router.patch("/:id/pay", async (req, res) => {
	const { amount } = req.body;
	const { id } = req.params;

	try {
		// 1. Ambil data lama
		const [rows] = await db.query(
			"SELECT total_price, paid_amount FROM shop_records WHERE id = ?",
			[id],
		);

		if (rows.length === 0)
			return res.status(404).json({ message: "Data tidak ditemukan" });

		// 2. Pastikan tidak ada nilai NULL agar matematika tidak error
		const currentPaid = parseFloat(rows[0].paid_amount || 0);
		const totalPrice = parseFloat(rows[0].total_price || 0);
		const additionalPaid = parseFloat(amount || 0);

		const newPaidAmount = currentPaid + additionalPaid;

		// 3. Tentukan status baru
		let newStatus = "partial";
		if (newPaidAmount >= totalPrice) {
			newStatus = "paid";
		}

		// 4. Update ke Database
		await db.execute(
			"UPDATE shop_records SET paid_amount = ?, status = ? WHERE id = ?",
			[newPaidAmount, newStatus, id],
		);

		res.json({
			success: true,
			message: "Pembayaran berhasil diperbarui",
			newPaidAmount,
			status: newStatus,
		});
	} catch (err) {
		console.error(err);
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

module.exports = router;
