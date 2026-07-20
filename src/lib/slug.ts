export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function validateSlug(value: string): string | null {
  if (!value.trim()) return 'El slug es obligatorio.';
  if (!SLUG_PATTERN.test(value)) {
    return 'Usa sólo letras minúsculas, números y guiones, sin espacios.';
  }
  return null;
}

export function buildPublicBookingUrl(barberiaSlug: string, barberoSlug?: string): string {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  const baseUrl = configuredUrl || window.location.origin;
  const path = barberoSlug
    ? `/b/${encodeURIComponent(barberiaSlug)}/${encodeURIComponent(barberoSlug)}`
    : `/b/${encodeURIComponent(barberiaSlug)}`;

  return `${baseUrl}${path}`;
}
