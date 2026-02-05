const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
	const token = req.header("Authorization")?.split(" ")[1];
	if (!token)
		return res.status(401).json({ message: "Akses ditolak, login dulu!" });

	try {
		const verified = jwt.verify(token, "RAHASIA_ALHADE_2026");
		req.user = verified;
		next(); // Lanjut ke proses berikutnya
	} catch (err) {
		res.status(400).json({ message: "Token tidak valid!" });
	}
};
