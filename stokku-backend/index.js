require("dotenv").config();
const express = require("express");
const cors = require("cors");
const productRoutes = require("./routes/productRoutes");
// const shoppingRoutes = require("./routes/shoppingRoutes"); // nanti tambah lagi

const app = express();
app.use(cors());
app.use(express.json());

// Pakai Routes
app.use("/api/products", productRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
