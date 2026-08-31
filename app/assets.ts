export const SITE_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function assetUrl(path: string) {
  return `${SITE_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
