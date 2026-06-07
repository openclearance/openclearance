// Canonical-host guard for Cloudflare Pages.
//
// Every Pages project is reachable at `<project>.pages.dev` and at a per-deploy
// preview host (`<hash>.<project>.pages.dev`). We want only the custom domain
// to serve content, so any request arriving on a `*.pages.dev` host is
// permanently redirected to openclearance.org (same path + query). This keeps
// preview/staging URLs from being independently visible or indexed, and
// canonicalises SEO on the real domain. Requests on openclearance.org fall
// through to the static assets unchanged.
const CANONICAL = "openclearance.org";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname.endsWith(".pages.dev")) {
    url.hostname = CANONICAL;
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
