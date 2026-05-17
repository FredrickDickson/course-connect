export const formatCoursePrice = (
  price: number | string | null | undefined,
  currency: string = "USD",
): string => {
  const n = Number(price);
  if (!n || Number.isNaN(n) || n <= 0) return "Free";
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};