// @ts-check
import { defineConfig } from 'astro/config';

// Static build. The deploy target (Cloudflare Pages) is set up separately.
// Set `site` to the canonical origin so canonical URLs and any future
// sitemap resolve correctly.
export default defineConfig({
  site: 'https://openclearance.org',
  output: 'static',
});
