export function getSafeHandshakeRedirect(requestUrl: URL) {
  if (requestUrl.pathname !== "/__clerk/v1/client/handshake") return null;

  const requestedRedirect = requestUrl.searchParams.get("redirect_url");
  if (!requestedRedirect) return new URL("/", requestUrl);

  try {
    const redirectUrl = new URL(requestedRedirect);
    return redirectUrl.origin === requestUrl.origin
      ? redirectUrl
      : new URL("/", requestUrl);
  } catch {
    return new URL("/", requestUrl);
  }
}
