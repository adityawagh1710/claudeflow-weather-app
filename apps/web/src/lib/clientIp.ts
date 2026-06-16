// Extract the originating client IP from proxy headers, skipping loopback/private
// addresses (which a geo-IP service cannot resolve). Returns null when only a local
// IP is seen (e.g. localhost/Docker) so callers query the bare endpoint instead.
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate =
    (forwarded ? forwarded.split(",")[0].trim() : null) ??
    request.headers.get("x-real-ip");
  if (!candidate) return null;
  const isPrivate =
    candidate === "::1" ||
    candidate.startsWith("127.") ||
    candidate.startsWith("10.") ||
    candidate.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(candidate) ||
    candidate.startsWith("fc") ||
    candidate.startsWith("fd");
  return isPrivate ? null : candidate;
}
