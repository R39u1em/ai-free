export function remoteUiRouteDenied(pathname, method) {
  if (pathname.startsWith("/v1/") || pathname.startsWith("/provider-frame/")) return true;
  if (["/api/shutdown", "/api/update/run", "/api/settings/openai-key"].includes(pathname)) return true;
  if (pathname === "/api/settings" && !["GET", "PUT"].includes(method)) return true;
  return false;
}
