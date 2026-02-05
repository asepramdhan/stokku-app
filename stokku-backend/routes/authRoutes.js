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
	const { email, password } = req.body;
	try {
		const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
			email,
		]);
		if (rows.length === 0)
			return res.status(401).json({ message: "Email tidak ditemukan!" });

		const user = rows[0];

		// Bandingkan password yang diketik dengan yang ada di DB (yg sudah di-hash)
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) return res.status(401).json({ message: "Password salah!" });

		// Buat Token JWT
		const token = jwt.sign(
			{ id: user.id },
			"RAHASIA_ALHADE_2026", // 💡 Pastikan ini SAMA dengan yang ada di middleware/auth.js
			{ expiresIn: "1d" },
		);

		// Kirim token ke React
		res.json({
			token,
			user: { id: user.id, name: user.name, email: user.email },
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
