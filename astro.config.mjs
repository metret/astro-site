// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import mdx from '@astrojs/mdx';
import rehypeFigure from '@microflash/rehype-figure';
import redirects from './astro.redirects.mjs';

import robotsTxt from "astro-robots-txt";

import sitemap from "@astrojs/sitemap";

const siteUrl = import.meta.env.DEV
  ? "http://localhost:4321"  // Default Astro dev server port
  : "https://ludi.co";

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  base: "/",
  trailingSlash: "never",

  devToolbar: {
    enabled: true,
  },

  redirects,

  vite: {
    plugins: [tailwindcss(), mdx()],
  },

  markdown: {
    rehypePlugins: [rehypeFigure],
  },

  image: {
    experimentalLayout: "none",
  },

  experimental: {
    responsiveImages: true,
  },

  integrations: [
    robotsTxt(),
    sitemap({
      filter(page) {
        const ignore = ["dev", "placeholder", "everything"].map(
          (path) => `${siteUrl}/${path}`
        );

        return !ignore.some((path) => page.includes(path));
      },
    }),
  ],
});