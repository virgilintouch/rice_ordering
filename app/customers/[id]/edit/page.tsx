import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { EditCustomerForm } from "@/app/customers/EditCustomerForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id: idRaw } = await params;
  const sp = await searchParams;
  const customerId = Number(idRaw);
  const addressId = Number(one(sp.addressId));
  if (!customerId || !addressId) notFound();

  const rows = await query<{
    id: number;
    code: string;
    name: string;
    source: string;
    note: string | null;
    status: string;
    address_id: number;
    recipient_name: string;
    recipient_phone: string;
    address: string;
    label: string | null;
  }>(
    `SELECT
       c.id,
       c.code,
       c.name,
       c.source,
       c.note,
       c.status,
       a.id AS address_id,
       a.recipient_name,
       a.recipient_phone,
       a.address,
       a.label
     FROM customers c
     JOIN customer_addresses a ON a.customer_id = c.id
     WHERE c.id = $1
       AND a.id = $2
       AND c.deleted_at IS NULL
     LIMIT 1`,
    [customerId, addressId],
  );

  const row = rows[0];
  if (!row) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">修改客户</h1>
          <p className="page-desc">可改客户档案与当前这条收货地址。</p>
        </div>
        <Link className="btn-secondary" href="/customers">
          返回客户
        </Link>
      </div>
      <div className="panel">
        <EditCustomerForm
          values={{
            customerId: row.id,
            addressId: row.address_id,
            code: row.code,
            name: row.name,
            source: row.source,
            note: row.note ?? "",
            status: row.status,
            recipientName: row.recipient_name,
            recipientPhone: row.recipient_phone,
            address: row.address,
            label: row.label ?? "",
          }}
        />
      </div>
    </>
  );
}
