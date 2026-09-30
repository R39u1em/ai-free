export function normalizeBasePath(value) {
  const base = String(value || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  if (!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/i.test(base)) throw new Error('Invalid AI_FREE_BASE_PATH');
  return base;
}

export function resolveUiRequestPath(pathname, basePath) {
  const base = normalizeBasePath(basePath);
  if (!base) return pathname;
  if (pathname === base || pathname === `${base}/`) return '/';
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : null;
}

export function prefixUiPaths(html, basePath) {
  const base = normalizeBasePath(basePath);
  if (!base) return html;
  return String(html)
    .replaceAll('"/api/', `"${base}/api/`)
    .replaceAll('"/embed/', `"${base}/embed/`)
    .replaceAll('img.src = src;', `img.src = src.startsWith("/api/") ? "${base}" + src : src;`);
}
