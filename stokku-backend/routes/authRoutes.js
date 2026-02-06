const express = require("express"),
	router = express.Router(),
	db = require("../config/db"),
	bcrypt = require("bcryptjs"),
	jwt = require("jsonwebtoken");

// REGISTER
// router.post("/register", async (req, res) => {
// 	const { name, email, password } = req.body;

// 	try {
// 		// 1. Cek apakah email sudah terdaftar
// 		const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
// 			email,
// 		]);
// 		if (existing.length > 0)
// 			return res.status(400).json({ message: "Email sudah digunakan!" });

// 		// 2. Hash Password biar aman (Bcrypt)
// 		const salt = await bcrypt.genSalt(10);
// 		const hashedPassword = await bcrypt.hash(password, salt);

// 		// 3. Simpan ke Database
// 		await db.execute(
// 			"INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
// 			[name, email, hashedPassword],
// 		);

// 		res.status(201).json({ message: "User berhasil dibuat!" });
// 	} catch (err) {
// 		res.status(500).json({ error: err.message });
// 	}
// });

// LOGIN
router.post("/login", async (req, res) => {
	res.header("Access-Control-Allow-Origin", "http://localhost:5173");
	// res.header("Access-Control-Allow-Origin", "https://stokku.portoku.id");
	const { email, password } = req.body;

	try {
		const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
			email,
		]);
		if (rows.length === 0)
			return res.status(401).json({ message: "Email tidak ditemukan!" });

		const user = rows[0];

		// 1. Cek Bcrypt (Sekarang harusnya cepat karena cost sudah 10)
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) return res.status(401).json({ message: "Password salah!" });

		// 2. Buat Token JWT
		// Pastikan JWT_SECRET di cPanel sama dengan "RAHASIA_STOKKU_2026"
		const secretKey = process.env.JWT_SECRET || "RAHASIA_STOKKU_2026";
		const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: "1d" });

		return res.json({
			token,
			user: { id: user.id, name: user.name, email: user.email },
		});
	} catch (err) {
		return res
			.status(500)
			.json({ message: "Server Error", error: err.message });
	}
});

module.exports = router;
