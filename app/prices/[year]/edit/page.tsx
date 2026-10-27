import { notFound } from "next/navigation";

/**
 * Legacy path without batch. Open /prices/[year]/[batch]/edit for a specific row.
 * New batches are server-assigned; this route does not invent one.
 */
export default function LegacyEditPriceWithoutBatchPage() {
  notFound();
}
