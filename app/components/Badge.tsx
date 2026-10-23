export function Badge({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <span className={`badge badge-${value}`}>{children}</span>;
}
