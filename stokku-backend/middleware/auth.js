const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
	const token = req.header("Authorization")?.split(" ")[1];
	if (!token)
		return res.status(401).json({ message: "Akses ditolak, login dulu!" });

	try {
		// 💡 Gunakan process.env.JWT_SECRET, kalau gak ada baru pakai fallback
		const secret = process.env.JWT_SECRET || "RAHASIA_STOKKU_2026";
		const verified = jwt.verify(token, secret);
		req.user = verified;
		next();
	} catch (err) {
		res.status(400).json({ message: "Token tidak valid!" });
	}
};
