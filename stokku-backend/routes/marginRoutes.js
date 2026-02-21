const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

// Ambil Margin dengan Pagination & Filter
router.get("/", async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1,
			limit = parseInt(req.query.limit) || 10,
			search = req.query.search || "",
			range = req.query.range || "all",
			store = req.query.store || "All",
			offset = (page - 1) * limit;

		// 1. Filter Logic
		let whereClause = "WHERE (i.name LIKE ? OR st.name LIKE ?)",
			params = [`%${search}%`, `%${search}%`];

		if (range === "today")
			whereClause += " AND DATE(s.created_at) = DATE(NOW())";
		if (range === "week")
			whereClause += " AND YEARWEEK(s.created_at, 1) = YEARWEEK(NOW(), 1)";
		if (range === "month")
			whereClause +=
				" AND MONTH(s.created_at) = MONTH(NOW()) AND YEAR(s.created_at) = YEAR(NOW())";

		if (store !== "All") {
			whereClause += " AND st.name = ?";
			params.push(store);
		}

		// 2. Query Utama dengan Kalkulasi Margin di SQL
		const dataQuery = `
      SELECT 
        s.id, s.qty, s.selling_price, s.total_price, s.created_at,
        i.name as product_name, i.avg_cost as capital,
        st.name as store_name, st.platform, st.admin_fee, st.extra_promo_fee, st.handling_fee,
        -- Kalkulasi Biaya & Profit
        ((s.total_price * st.admin_fee / 100) + (s.total_price * st.extra_promo_fee / 100) + st.handling_fee) as total_fees,
        (s.total_price - (s.qty * i.avg_cost) - ((s.total_price * st.admin_fee / 100) + (s.total_price * st.extra_promo_fee / 100) + st.handling_fee)) as net_profit
      FROM sales s
      JOIN inventory i ON s.product_id = i.id
      JOIN stores st ON s.store_id = st.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
			[rows] = await db.query(dataQuery, [...params, limit, offset]),
			// 3. Global Stats (Seluruh data yang terfilter)
			[stats] = await db.query(
				`
      SELECT 
        SUM(s.total_price) as total_revenue,
        SUM(s.total_price - (s.qty * i.avg_cost) - ((s.total_price * st.admin_fee / 100) + (s.total_price * st.extra_promo_fee / 100) + st.handling_fee)) as total_net_profit
      FROM sales s
      JOIN inventory i ON s.product_id = i.id
      JOIN stores st ON s.store_id = st.id
      ${whereClause}`,
				params,
			),
			revenue = stats[0].total_revenue || 0,
			netProfit = stats[0].total_net_profit || 0,
			// 4. Count for Pagination
			[countRows] = await db.query(
				`
      SELECT COUNT(*) as total FROM sales s JOIN inventory i ON s.product_id = i.id JOIN stores st ON s.store_id = st.id ${whereClause}`,
				params,
			);

		// 5. Ambil Top 3 Produk Paling Untung (Disesuaikan dengan filter)
		const topQuery = `
      SELECT 
        i.name as product_name,
        SUM(s.total_price - (s.qty * i.avg_cost) - ((s.total_price * st.admin_fee / 100) + (s.total_price * st.extra_promo_fee / 100) + st.handling_fee)) as total_net_profit
      FROM sales s
      JOIN inventory i ON s.product_id = i.id
      JOIN stores st ON s.store_id = st.id
      ${whereClause}
      GROUP BY s.product_id
      ORDER BY total_net_profit DESC
      LIMIT 3`;

		const [topProducts] = await db.query(topQuery, params);

		res.json({
			list: rows,
			topProducts: topProducts,
			stats: {
				totalRevenue: revenue,
				totalNetProfit: netProfit,
				avgMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
			},
			pagination: {
				totalData: countRows[0].total,
				totalPages: Math.ceil(countRows[0].total / limit),
				currentPage: page,
			},
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
