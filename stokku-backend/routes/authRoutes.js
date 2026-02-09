const express = require("express"),
	router = express.Router(),
	db = require("../config/db"),
	bcrypt = require("bcryptjs"),
	jwt = require("jsonwebtoken"),
	authMiddleware = require("../middleware/auth");

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

// 1. CEK APAKAH USER SUDAH PUNYA PIN
router.get("/check-pin", authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id; // Pastikan middleware auth kamu set req.user = { id: ... }
		const [rows] = await db.query("SELECT pin FROM users WHERE id = ?", [
			userId,
		]);

		if (rows.length === 0) {
			return res.status(404).json({ error: "User tidak ditemukan" });
		}

		// Cek apakah pin tidak null dan tidak kosong
		const hasPin = rows[0].pin !== null && rows[0].pin !== "";
		res.json({ hasPin });
	} catch (err) {
		console.error("Error di check-pin:", err);
		res.status(500).json({ error: err.message });
	}
});

// 2. SET PIN BARU
router.post("/set-pin", authMiddleware, async (req, res) => {
	const { pin } = req.body;

	if (!pin || pin.length !== 6) {
		return res.status(400).json({ error: "PIN harus 6 digit" });
	}

	try {
		const hashedPin = await bcrypt.hash(pin, 10);
		const userId = req.user.id;

		await db.execute("UPDATE users SET pin = ? WHERE id = ?", [
			hashedPin,
			userId,
		]);
		res.json({ message: "PIN berhasil disimpan!" });
	} catch (err) {
		console.error("Error di set-pin:", err);
		res.status(500).json({ error: err.message });
	}
});

// 3. VERIFIKASI PIN
router.post("/verify-pin", authMiddleware, async (req, res) => {
	const { pin } = req.body;
	try {
		const [rows] = await db.query("SELECT pin FROM users WHERE id = ?", [
			req.user.id,
		]);

		if (!rows[0].pin) {
			return res.status(400).json({ message: "PIN belum disetel!" });
		}

		const isMatch = await bcrypt.compare(pin, rows[0].pin);
		if (isMatch) return res.json({ success: true });

		res.status(401).json({ message: "PIN salah!" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 4. UPDATE PROFIL (NAMA & EMAIL)
router.put("/update-profile", authMiddleware, async (req, res) => {
	const { name, email } = req.body;
	const userId = req.user.id;

	try {
		await db.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", [
			name,
			email,
			userId,
		]);
		res.json({ success: true, message: "Profil berhasil diperbarui!" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 5. GANTI PIN (DENGAN VERIFIKASI PIN LAMA)
router.put("/update-pin", authMiddleware, async (req, res) => {
	const { oldPin, newPin } = req.body;
	const userId = req.user.id;

	try {
		// Ambil PIN lama dari database
		const [rows] = await db.query("SELECT pin FROM users WHERE id = ?", [
			userId,
		]);
		const isMatch = await bcrypt.compare(oldPin, rows[0].pin);

		if (!isMatch) {
			return res.status(401).json({ error: "PIN lama salah!" });
		}

		// Hash PIN baru
		const hashedPin = await bcrypt.hash(newPin.toString(), 10);
		await db.execute("UPDATE users SET pin = ? WHERE id = ?", [
			hashedPin,
			userId,
		]);

		res.json({ success: true, message: "PIN Keamanan berhasil diganti!" });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 6. AMBIL DATA PROFIL USER YANG SEDANG LOGIN
router.get("/me", authMiddleware, async (req, res) => {
	try {
		const [rows] = await db.query(
			"SELECT name, email FROM users WHERE id = ?",
			[req.user.id],
		);
		if (rows.length === 0)
			return res.status(404).json({ error: "User tidak ditemukan" });

		res.json(rows[0]);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
