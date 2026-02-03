const express = require("express"),
	router = express.Router(),
	db = require("../config/db");

router.get("/stats", async (req, res) => {
	const { range } = req.query; // Ambil parameter ?range=...

	// WAJIB: Tambahkan alias 's.' supaya tidak bentrok dengan tabel inventory/products
	let dateFilter = "WHERE 1=1";
	if (range === "today") dateFilter = "WHERE DATE(s.created_at) = DATE(NOW())";
	if (range === "week")
		dateFilter = "WHERE YEARWEEK(s.created_at, 1) = YEARWEEK(NOW(), 1)";
	if (range === "month")
		dateFilter =
			"WHERE MONTH(s.created_at) = MONTH(NOW()) AND YEAR(s.created_at) = YEAR(NOW())";

	try {
		// 1. Omset & Pesanan (Pakai Filter)
		const [salesStats] = await db.query(`
      SELECT 
        COALESCE(SUM(s.total_price), 0) as total_revenue, 
        COUNT(s.id) as total_orders,
				COALESCE(SUM(s.qty), 0) as total_qty_sold
      FROM sales s ${dateFilter}
    `),
			// 2. Aset Stok (Tetap hitung total gudang, tidak dipengaruhi filter tanggal)
			[stockStats] = await db.query(
				"SELECT COALESCE(SUM(quantity * avg_cost), 0) as total_stock_value,COALESCE(SUM(quantity), 0) as total_stock_pcs FROM inventory",
			),
			// 3. Top Products (Pakai Filter)
			[topProducts] = await db.query(`
      SELECT i.name, i.sku, CAST(SUM(s.qty) AS UNSIGNED) as total_qty
      FROM sales s JOIN inventory i ON s.product_id = i.id
      ${dateFilter}
      GROUP BY s.product_id, i.name, i.sku 
      ORDER BY total_qty DESC LIMIT 5
    `),
			// 4. Low Stock Alert (Barang yang stoknya < 10)
			[lowStock] = await db.query(
				"SELECT id, name, quantity FROM inventory WHERE quantity < 10 ORDER BY quantity ASC LIMIT 5",
			),
			// 5. Chart (Tetap 7 hari terakhir agar grafik ada isinya)
			[chartData] = await db.query(`
      SELECT DATE_FORMAT(s.created_at, '%d %b') as date, SUM(s.total_price) as amount 
      FROM sales s
      WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY date, DATE(s.created_at)
      ORDER BY DATE(s.created_at) ASC
    `),
			// 6. Distribusi Penjualan per Platform
			[platformData] = await db.query(`
      SELECT 
        COALESCE(st.platform, 'Lainnya') as name,
        CAST(SUM(s.total_price) AS UNSIGNED) as value
      FROM sales s
      JOIN stores st ON s.store_id = st.id
      ${dateFilter} 
      GROUP BY st.platform
    `),
			// --- LOGIKA PERHITUNGAN TURNOVER ---
			qtySold = Number(salesStats[0].total_qty_sold),
			qtyInStock = Number(stockStats[0].total_stock_pcs),
			// Rumus: (Terjual / (Terjual + Sisa Stok)) * 100
			// Ini menunjukkan berapa persen barang yang "bergerak" keluar dari total barang yang pernah ada.
			turnoverRate = qtySold > 0 ? (qtySold / (qtySold + qtyInStock)) * 100 : 0;

		res.json({
			revenue: Number(salesStats[0].total_revenue),
			orders: Number(salesStats[0].total_orders),
			stockValue: Number(stockStats[0].total_stock_value),
			turnover: turnoverRate.toFixed(1),
			chart: chartData || [],
			platforms: platformData || [],
			topProducts: topProducts || [],
			lowStock: lowStock || [],
		});
	} catch (err) {
		console.error("DASHBOARD ERROR:", err); // Lihat pesan error detil di terminal backend!
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
