import pg from "pg";

const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "rice_ordering",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

async function nextCode(client) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 2) AS INTEGER)), 0) + 1 AS next
     FROM customers WHERE code ~ '^C[0-9]+$'`,
  );
  return `C${String(rows[0].next).padStart(4, "0")}`;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const code = await nextCode(client);
    const name = `烟雾测试_${Date.now()}`;
    const { rows: cust } = await client.query(
      `INSERT INTO customers (code, name, source, status) VALUES ($1,$2,'PDD','active') RETURNING id`,
      [code, name],
    );
    const customerId = cust[0].id;
    const { rows: addr } = await client.query(
      `INSERT INTO customer_addresses (customer_id, recipient_name, recipient_phone, address, is_default, is_active)
       VALUES ($1,'收件人','13800008888','测试地址',true,true) RETURNING id`,
      [customerId],
    );
    const { rows: price } = await client.query(
      `SELECT retail_plain_per_jin, jin_per_pack, rice_cost_per_jin, shipping_fee_per_jin
       FROM rice_year_prices WHERE year=2026`,
    );
    if (!price[0]) throw new Error("missing 2026 price");
    const unit = Number(price[0].retail_plain_per_jin);
    const jin = Number(price[0].jin_per_pack);
    const packs = 2;
    const amount = (unit * jin * packs).toFixed(2);
    const day = new Date();
    const prefix = `O${day.getFullYear()}${String(day.getMonth()+1).padStart(2,"0")}${String(day.getDate()).padStart(2,"0")}-`;
    const { rows: seq } = await client.query(
      `SELECT COALESCE(MAX(CAST(RIGHT(order_no,4) AS INTEGER)),0)+1 AS next FROM orders WHERE order_no LIKE $1`,
      [`${prefix}%`],
    );
    const orderNo = `${prefix}${String(seq[0].next).padStart(4, "0")}`;
    await client.query(
      `INSERT INTO orders (
         order_no, customer_id, address_id, price_year,
         recipient_name, recipient_phone, address,
         price_tier, pack_count, jin_per_pack,
         unit_price_per_jin, rice_cost_per_jin, shipping_fee_per_jin, vacuum_fee_per_jin,
         amount, status, ordered_at
       ) VALUES (
         $1,$2,$3,2026,'收件人','13800008888','测试地址',
         'retail_plain',$4,$5,$6,$7,$8,0,$9,'ordered',NOW()
       )`,
      [
        orderNo,
        customerId,
        addr[0].id,
        packs,
        jin,
        unit.toFixed(2),
        Number(price[0].rice_cost_per_jin).toFixed(2),
        Number(price[0].shipping_fee_per_jin).toFixed(2),
        amount,
      ],
    );
    await client.query("COMMIT");
    console.log(JSON.stringify({ code, name, orderNo, amount }, null, 2));
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
