// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import mdx from '@astrojs/mdx';
import rehypeFigure from '@microflash/rehype-figure';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), mdx()],
  },
  markdown: {
    rehypePlugins: [rehypeFigure],
  },
});
