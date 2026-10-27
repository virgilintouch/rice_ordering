import { notFound } from "next/navigation";

/**
 * Legacy path without batch. Batch is manual only — do not invent one here.
 * Callers must open /prices/[year]/[batch]/edit after choosing a batch.
 */
export default function LegacyEditPriceWithoutBatchPage() {
  notFound();
}
