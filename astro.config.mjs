// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import mdx from '@astrojs/mdx';
import rehypeFigure from '@microflash/rehype-figure';
import redirects from './astro.redirects.mjs';

// https://astro.build/config
export default defineConfig({
  site: "https://astro.deqo.dev",
  base: "/",
  redirects,
  vite: {
    plugins: [tailwindcss(), mdx()],
  },
  markdown: {
    rehypePlugins: [rehypeFigure],
  },
});