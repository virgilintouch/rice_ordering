"use client";

import Link from "next/link";
import { deleteStaffUserAction } from "@/app/users/actions";

export function UserRowActions({
  userId,
  username,
  role,
}: {
  userId: number;
  username: string;
  role: string;
}) {
  const canDelete = role !== "admin";

  return (
    <div className="row-actions">
      <Link className="linkish" href={`/users/${userId}/edit`}>
        修改
      </Link>
      {canDelete ? (
        <form
          action={deleteStaffUserAction}
          onSubmit={(e) => {
            if (
              !window.confirm(
                `确定删除账号「${username}」？\n删除后无法登录，且不可恢复。`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" className="linkish danger">
            删除
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="linkish danger"
          disabled
          title="管理员账号不可删除"
        >
          删除
        </button>
      )}
    </div>
  );
}
