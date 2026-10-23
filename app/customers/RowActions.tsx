"use client";

import Link from "next/link";
import { deleteCustomerAction, setCustomerStatusAction } from "@/app/customers/actions";

export function RowActions({
  customerId,
  addressId,
  customerName,
  status,
}: {
  customerId: number;
  addressId: number | null;
  customerName: string;
  status: string;
}) {
  return (
    <div className="row-actions">
      {addressId != null ? (
        <Link
          className="linkish"
          href={`/customers/${customerId}/edit?addressId=${addressId}`}
        >
          修改
        </Link>
      ) : (
        <span className="meta">—</span>
      )}
      <form action={setCustomerStatusAction}>
        <input type="hidden" name="customerId" value={customerId} />
        <input
          type="hidden"
          name="status"
          value={status === "active" ? "disabled" : "active"}
        />
        <button type="submit" className="linkish">
          {status === "active" ? "停用" : "启用"}
        </button>
      </form>
      <form
        action={deleteCustomerAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              `确定删除客户「${customerName}」？\n将软删除该客户（历史订单保留），列表中不再显示。`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="customerId" value={customerId} />
        <button type="submit" className="linkish danger">
          删除
        </button>
      </form>
    </div>
  );
}
