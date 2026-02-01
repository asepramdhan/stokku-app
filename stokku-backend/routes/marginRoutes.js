const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

router.get("/", async (req, res) => {
	const { range } = req.query;

	// Logika Filter Tanggal (Gunakan s.created_at untuk menghindari ambiguity)
	let dateFilter = "WHERE 1=1";
	if (range === "today") dateFilter = "WHERE DATE(s.created_at) = DATE(NOW())";
	if (range === "week")
		dateFilter = "WHERE YEARWEEK(s.created_at, 1) = YEARWEEK(NOW(), 1)";
	if (range === "month")
		dateFilter =
			"WHERE MONTH(s.created_at) = MONTH(NOW()) AND YEAR(s.created_at) = YEAR(NOW())";

	try {
		const query = `
      SELECT 
        s.id, s.qty, s.selling_price, s.total_price, s.created_at,
        i.name as product_name, i.avg_cost as capital,
        st.name as store_name, st.platform, st.admin_fee, st.extra_promo_fee, st.handling_fee
      FROM sales s
      JOIN inventory i ON s.product_id = i.id
      JOIN stores st ON s.store_id = st.id
      ${dateFilter}
      ORDER BY s.created_at DESC`,
			[rows] = await db.query(query);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
