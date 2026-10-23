import { query, withTransaction } from "@/lib/db";

export type CreateCustomerInput = {
  name: string;
  source: string;
  note?: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  label?: string;
};

async function nextCustomerCode(
  q: typeof query = query,
): Promise<string> {
  const rows = await q<{ next: number }>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 2) AS INTEGER)), 0) + 1 AS next
     FROM customers
     WHERE code ~ '^C[0-9]+$'`,
  );
  const n = rows[0]?.next ?? 1;
  return `C${String(n).padStart(4, "0")}`;
}

export async function createCustomerWithAddress(
  input: CreateCustomerInput,
): Promise<{ customerId: number; code: string }> {
  const name = input.name.trim();
  const source = input.source.trim();
  const recipientName = input.recipientName.trim();
  const recipientPhone = input.recipientPhone.trim();
  const address = input.address.trim();

  if (!name || !source || !recipientName || !recipientPhone || !address) {
    throw new Error("姓名、来源、收件人、电话、地址均为必填");
  }

  return withTransaction(async (q) => {
    const existing = await q<{ id: number }>(
      `SELECT id FROM customers WHERE name = $1 AND deleted_at IS NULL LIMIT 1`,
      [name],
    );
    if (existing[0]) {
      throw new Error(`客户姓名已存在：${name}`);
    }

    const code = await nextCustomerCode(q);
    const customers = await q<{ id: number }>(
      `INSERT INTO customers (code, name, source, note, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id`,
      [code, name, source, input.note?.trim() || null],
    );
    const customerId = customers[0].id;

    await q(
      `INSERT INTO customer_addresses
         (customer_id, recipient_name, recipient_phone, address, label, is_default, is_active)
       VALUES ($1, $2, $3, $4, $5, true, true)`,
      [
        customerId,
        recipientName,
        recipientPhone,
        address,
        input.label?.trim() || null,
      ],
    );

    return { customerId, code };
  });
}

export async function setCustomerStatus(
  customerId: number,
  status: "active" | "disabled",
): Promise<void> {
  const rows = await query(
    `UPDATE customers
     SET status = $2, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [customerId, status],
  );
  if (!rows[0]) {
    throw new Error("客户不存在或已删除");
  }
}

export type UpdateCustomerAddressInput = {
  customerId: number;
  addressId: number;
  name: string;
  source: string;
  note?: string;
  status: "active" | "disabled";
  recipientName: string;
  recipientPhone: string;
  address: string;
  label?: string;
};

export async function updateCustomerAndAddress(
  input: UpdateCustomerAddressInput,
): Promise<void> {
  const name = input.name.trim();
  const source = input.source.trim();
  const recipientName = input.recipientName.trim();
  const recipientPhone = input.recipientPhone.trim();
  const address = input.address.trim();

  if (!name || !source || !recipientName || !recipientPhone || !address) {
    throw new Error("姓名、来源、收件人、电话、地址均为必填");
  }
  if (input.status !== "active" && input.status !== "disabled") {
    throw new Error("状态无效");
  }

  await withTransaction(async (q) => {
    const dup = await q<{ id: number }>(
      `SELECT id FROM customers
       WHERE name = $1 AND deleted_at IS NULL AND id <> $2
       LIMIT 1`,
      [name, input.customerId],
    );
    if (dup[0]) {
      throw new Error(`客户姓名已存在：${name}`);
    }

    const customers = await q(
      `UPDATE customers
       SET name = $2, source = $3, note = $4, status = $5, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [input.customerId, name, source, input.note?.trim() || null, input.status],
    );
    if (!customers[0]) {
      throw new Error("客户不存在或已删除");
    }

    const addresses = await q(
      `UPDATE customer_addresses
       SET recipient_name = $3,
           recipient_phone = $4,
           address = $5,
           label = $6,
           updated_at = NOW()
       WHERE id = $1 AND customer_id = $2
       RETURNING id`,
      [
        input.addressId,
        input.customerId,
        recipientName,
        recipientPhone,
        address,
        input.label?.trim() || null,
      ],
    );
    if (!addresses[0]) {
      throw new Error("地址不存在或不属于该客户");
    }
  });
}

/** 软删除客户（不物理删，避免影响历史订单外键） */
export async function softDeleteCustomer(customerId: number): Promise<void> {
  const rows = await query(
    `UPDATE customers
     SET deleted_at = NOW(),
         status = 'disabled',
         updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [customerId],
  );
  if (!rows[0]) {
    throw new Error("客户不存在或已删除");
  }
}

export type ImportRow = {
  name: string;
  source: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
};

export type ImportResult = {
  createdCustomers: number;
  addedAddresses: number;
  skipped: number;
  failed: { line: number; reason: string }[];
};

export async function importCustomerRows(
  rows: ImportRow[],
): Promise<ImportResult> {
  const result: ImportResult = {
    createdCustomers: 0,
    addedAddresses: 0,
    skipped: 0,
    failed: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2; // header is line 1
    const row = rows[i];
    const name = row.name.trim();
    const source = row.source.trim();
    const recipientName = row.recipientName.trim();
    const recipientPhone = row.recipientPhone.trim();
    const address = row.address.trim();

    if (!name && !source && !recipientName && !recipientPhone && !address) {
      result.skipped += 1;
      continue;
    }
    if (!name || !source || !recipientName || !recipientPhone || !address) {
      result.failed.push({ line, reason: "必填字段缺失" });
      continue;
    }

    try {
      await withTransaction(async (q) => {
        const existing = await q<{ id: number }>(
          `SELECT id FROM customers WHERE name = $1 AND deleted_at IS NULL LIMIT 1`,
          [name],
        );

        let customerId: number;
        if (existing[0]) {
          customerId = existing[0].id;
        } else {
          const code = await nextCustomerCode(q);
          const created = await q<{ id: number }>(
            `INSERT INTO customers (code, name, source, status)
             VALUES ($1, $2, $3, 'active')
             RETURNING id`,
            [code, name, source],
          );
          customerId = created[0].id;
          result.createdCustomers += 1;
        }

        const dup = await q<{ id: number }>(
          `SELECT id FROM customer_addresses
           WHERE customer_id = $1
             AND recipient_name = $2
             AND recipient_phone = $3
             AND address = $4
           LIMIT 1`,
          [customerId, recipientName, recipientPhone, address],
        );
        if (dup[0]) {
          result.skipped += 1;
          return;
        }

        const hasAny = await q<{ n: number }>(
          `SELECT COUNT(*)::int AS n FROM customer_addresses WHERE customer_id = $1`,
          [customerId],
        );
        const isDefault = (hasAny[0]?.n ?? 0) === 0;

        await q(
          `INSERT INTO customer_addresses
             (customer_id, recipient_name, recipient_phone, address, is_default, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [customerId, recipientName, recipientPhone, address, isDefault],
        );
        result.addedAddresses += 1;
      });
    } catch (error) {
      result.failed.push({
        line,
        reason: error instanceof Error ? error.message : "导入失败",
      });
    }
  }

  return result;
}
