import { query, withTransaction } from "@/lib/db";
import { optionalText, requiredId, requiredText } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { logServerError, PublicError, publicErrorMessage } from "@/lib/public-error";

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
  const name = requiredText(input.name, "姓名", LIMITS.customerName);
  const source = requiredText(input.source, "来源", LIMITS.source);
  const note = optionalText(input.note, "备注", LIMITS.note);
  const recipientName = requiredText(input.recipientName, "收件人", LIMITS.recipientName);
  const recipientPhone = requiredText(input.recipientPhone, "电话", LIMITS.recipientPhone);
  const address = requiredText(input.address, "地址", LIMITS.address);
  const label = optionalText(input.label, "地址标签", LIMITS.label);

  return withTransaction(async (q) => {
    const existing = await q<{ id: number }>(
      `SELECT id FROM customers WHERE name = $1 AND deleted_at IS NULL LIMIT 1`,
      [name],
    );
    if (existing[0]) {
      throw new PublicError(`客户姓名已存在：${name}`);
    }

    const code = await nextCustomerCode(q);
    const customers = await q<{ id: number }>(
      `INSERT INTO customers (code, name, source, note, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id`,
      [code, name, source, note],
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
        label,
      ],
    );

    return { customerId, code };
  });
}

export async function setCustomerStatus(
  customerId: number,
  status: "active" | "disabled",
): Promise<void> {
  const id = requiredId(customerId, "客户");
  if (status !== "active" && status !== "disabled") {
    throw new PublicError("状态无效");
  }
  const rows = await query(
    `UPDATE customers
     SET status = $2, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id, status],
  );
  if (!rows[0]) {
    throw new PublicError("客户不存在或已删除");
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
  const customerId = requiredId(input.customerId, "客户");
  const addressId = requiredId(input.addressId, "地址");
  const name = requiredText(input.name, "姓名", LIMITS.customerName);
  const source = requiredText(input.source, "来源", LIMITS.source);
  const note = optionalText(input.note, "备注", LIMITS.note);
  const recipientName = requiredText(input.recipientName, "收件人", LIMITS.recipientName);
  const recipientPhone = requiredText(input.recipientPhone, "电话", LIMITS.recipientPhone);
  const address = requiredText(input.address, "地址", LIMITS.address);
  const label = optionalText(input.label, "地址标签", LIMITS.label);

  if (input.status !== "active" && input.status !== "disabled") {
    throw new PublicError("状态无效");
  }

  await withTransaction(async (q) => {
    const dup = await q<{ id: number }>(
      `SELECT id FROM customers
       WHERE name = $1 AND deleted_at IS NULL AND id <> $2
       LIMIT 1`,
      [name, customerId],
    );
    if (dup[0]) {
      throw new PublicError(`客户姓名已存在：${name}`);
    }

    const customers = await q(
      `UPDATE customers
       SET name = $2, source = $3, note = $4, status = $5, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [customerId, name, source, note, input.status],
    );
    if (!customers[0]) {
      throw new PublicError("客户不存在或已删除");
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
      [addressId, customerId, recipientName, recipientPhone, address, label],
    );
    if (!addresses[0]) {
      throw new PublicError("地址不存在或不属于该客户");
    }
  });
}

/** 软删除客户（不物理删，避免影响历史订单外键） */
export async function softDeleteCustomer(customerId: number): Promise<void> {
  const id = requiredId(customerId, "客户");
  const rows = await query(
    `UPDATE customers
     SET deleted_at = NOW(),
         status = 'disabled',
         updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id],
  );
  if (!rows[0]) {
    throw new PublicError("客户不存在或已删除");
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

    let cleanName: string;
    let cleanSource: string;
    let cleanRecipientName: string;
    let cleanRecipientPhone: string;
    let cleanAddress: string;
    try {
      cleanName = requiredText(name, "姓名", LIMITS.customerName);
      cleanSource = requiredText(source, "来源", LIMITS.source);
      cleanRecipientName = requiredText(row.recipientName, "收件人", LIMITS.recipientName);
      cleanRecipientPhone = requiredText(row.recipientPhone, "电话", LIMITS.recipientPhone);
      cleanAddress = requiredText(row.address, "地址", LIMITS.address);
    } catch (error) {
      result.failed.push({
        line,
        reason: publicErrorMessage(error, "导入失败"),
      });
      continue;
    }

    try {
      await withTransaction(async (q) => {
        const existing = await q<{ id: number }>(
          `SELECT id FROM customers WHERE name = $1 AND deleted_at IS NULL LIMIT 1`,
          [cleanName],
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
            [code, cleanName, cleanSource],
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
          [customerId, cleanRecipientName, cleanRecipientPhone, cleanAddress],
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
          [customerId, cleanRecipientName, cleanRecipientPhone, cleanAddress, isDefault],
        );
        result.addedAddresses += 1;
      });
    } catch (error) {
      logServerError("importCustomerRows", error);
      result.failed.push({
        line,
        reason: publicErrorMessage(error, "导入失败"),
      });
    }
  }

  return result;
}
