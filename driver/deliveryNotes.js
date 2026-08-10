const express = require("express");
const router = express.Router();

// ⭐ DIRECT NEON CONNECTION
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/* ---------------------------------------------------------
   CREATE DELIVERY NOTE
--------------------------------------------------------- */
router.post("/create", async (req, res) => {
  const { order_id, note } = req.body;

  try {
    const orderResult = await pool.query(
      "SELECT * FROM orders WHERE order_id = $1",
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    await pool.query(
      `INSERT INTO delivery_notes 
       (order_id, customer_name, customer_email, address, items, driver_name, note, delivery_status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Out for Delivery',NOW())`,
      [
        order.order_id,
        order.customer_name,
        order.email,
        order.address,
        order.items,
        order.driver_name,
        note
      ]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("DELIVERY NOTE ERROR:", err);
    res.status(500).json({ error: "Failed to create delivery note" });
  }
});

/* ---------------------------------------------------------
   GET ALL DELIVERY NOTES
--------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM delivery_notes ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------------------------------------
   GET DELIVERY NOTES + ORDER DETAILS
--------------------------------------------------------- */
router.get("/all", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        dn.id AS delivery_note_id,
        dn.order_id,
        dn.driver_name,
        dn.delivery_status,
        dn.created_at,
        o.customer_name,
        o.order_date,
        o.order_time
      FROM delivery_notes dn
      JOIN orders o ON dn.order_id = o.order_id
      ORDER BY dn.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("DELIVERY NOTES FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch delivery notes" });
  }
});

/* ---------------------------------------------------------
   GET DELIVERY NOTE BY ORDER ID
--------------------------------------------------------- */
router.get("/by-order/:order_id", async (req, res) => {
  const { order_id } = req.params;

  if (!order_id || order_id === "null") {
    return res.status(400).json({ error: "Invalid order ID" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM delivery_notes 
       WHERE order_id = $1 
       ORDER BY id DESC 
       LIMIT 1`,
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    let note = result.rows[0];

    if (!Array.isArray(note.items)) {
      note.items = [];
    }

    res.json(note);

  } catch (err) {
    console.error("DELIVERY NOTE FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch delivery note" });
  }
});

/* ---------------------------------------------------------
   UPDATE DELIVERY NOTE (signatures + delivered status)
--------------------------------------------------------- */
router.put("/delivered/:order_id", async (req, res) => {
  const { order_id } = req.params;
  const { customer_signature, driver_signature, driver_note } = req.body;

  try {
    await pool.query(
      `UPDATE delivery_notes
       SET customer_signature = $1,
           driver_signature = $2,
           note = $3,
           delivery_status = 'Delivered',
           delivered_at = NOW()
       WHERE order_id = $4`,
      [
        customer_signature,
        driver_signature,
        driver_note,
        order_id
      ]
    );

    await pool.query(
      `UPDATE orders 
       SET status = 'Delivered'
       WHERE order_id = $1`,
      [order_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("DELIVERY UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update delivery note" });
  }
});

/* ---------------------------------------------------------
   SIMPLE DELIVER ROUTE
--------------------------------------------------------- */
router.put("/deliver/:order_id", async (req, res) => {
  const { order_id } = req.params;

  try {
    const noteRes = await pool.query(
      `UPDATE delivery_notes 
       SET delivery_status = 'Delivered',
           delivered_at = NOW()
       WHERE order_id = $1
       RETURNING order_id`,
      [order_id]
    );

    if (noteRes.rows.length === 0) {
      return res.status(404).json({ error: "Delivery note not found" });
    }

    await pool.query(
      `UPDATE orders 
       SET status = 'Delivered'
       WHERE order_id = $1`,
      [order_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("DELIVER ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ---------------------------------------------------------
   ASSIGN DRIVER (kept as-is)
--------------------------------------------------------- */
router.put("/assign-driver/:order_id", async (req, res) => {
  const { order_id } = req.params;
  const { driver_id } = req.body;

  try {
    await pool.query(
      `UPDATE delivery_notes
       SET driver_id = $1,
           driver_name = (SELECT name FROM drivers WHERE id = $1)
       WHERE order_id = $2`,
      [driver_id, order_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("ASSIGN DRIVER ERROR:", err);
    res.status(500).json({ success: false, error: "Failed to assign driver" });
  }
});

/* ---------------------------------------------------------
   ⭐ GET DELIVERY NOTES BY DRIVER NAME (NEW FIX)
--------------------------------------------------------- */
router.get("/driver/name/:driverName", async (req, res) => {
  const { driverName } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        dn.id AS delivery_note_id,
        dn.order_id,
        dn.customer_name,
        dn.address,
        dn.delivery_status,
        dn.items,
        dn.note,
        dn.created_at,
        dn.driver_name
      FROM delivery_notes dn
      WHERE dn.driver_name = $1
      ORDER BY dn.id DESC`,
      [driverName]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("DRIVER DELIVERY FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch driver deliveries" });
  }
});

module.exports = router;
