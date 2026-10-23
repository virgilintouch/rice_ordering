"use client";

export function OrderDetailActions() {
  return (
    <div className="detail-actions no-print">
      <button
        type="button"
        className="detail-action-primary"
        onClick={() => window.print()}
      >
        打印订单
      </button>
      <button
        type="button"
        className="detail-action-secondary"
        onClick={() => window.close()}
      >
        关闭窗口
      </button>
    </div>
  );
}
