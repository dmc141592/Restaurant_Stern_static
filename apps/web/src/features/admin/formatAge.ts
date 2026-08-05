export function formatAge(isoTimestamp: string): string {
  const createdAt = new Date(isoTimestamp).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - createdAt) / 60_000));

  if (minutes < 60) {
    return `${minutes} Min.`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} Std. ${minutes % 60} Min.`;
  }
  const days = Math.floor(hours / 24);
  return `${days} Tag(e) ${hours % 24} Std.`;
}
