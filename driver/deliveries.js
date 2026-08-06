const express = require("express");
const router = express.Router();
const pool = require("../db");

/* ---------------------------------------------------------
   GET ALL DELIVERIES FOR A DRIVER (BY DRIVER NAME)
--------------------------------------------------------- */
router.get("/driver/:driverName", async (req, res) => {
    const { driverName } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM deliveries 
             WHERE driver_name = $1 
             ORDER BY id DESC`,
            [driverName]
        );

        res.json(result.rows);

    } catch (err) {
        console.error("DELIVERIES ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ---------------------------------------------------------
   GET A SINGLE DELIVERY NOTE BY ORDER ID
--------------------------------------------------------- */
router.get("/:orderId", async (req, res) => {
    const { orderId } = req.params;

    try {
        const result = await pool.query(
            "SELECT * FROM deliveries WHERE order_id = $1",
            [orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Delivery not found" });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error("DELIVERY NOTE ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
