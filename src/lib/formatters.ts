export function capitalizeFirstChar(str?: string): string {
  if (!str) return 'Untitled';
  const trimmed = str.trim();
  if (!trimmed) return 'Untitled';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
