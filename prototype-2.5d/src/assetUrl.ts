/** Resolve public assets relative to the app so it also works from a GitHub Pages subpath. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
