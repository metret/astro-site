#!/usr/bin/env ts-node

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function getCurrentDateTime(): string {
  const now = new Date();

  return now.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

async function main() {
  console.log('Creating a new blog post...\n');

  // Prompt for title
  const title = await question('Title: ');

  if (!title.trim()) {
    console.error('Error: Title is required');
    process.exit(1);
  }

  // Prompt for category with options
  console.log('\nCategory options:');
  const categories = ['Product', 'Guides', 'Overviews', 'Customer Stories', 'Article', 'Announcements', 'Updates'];

  categories.forEach((cat, index) => {
    console.log(`  ${index + 1}. ${cat}`);
  });

  const categoryInput = await question('\nSelect category (1-7): ');

  const categoryIndex = parseInt(categoryInput) - 1;

  if (categoryIndex < 0 || categoryIndex >= categories.length) {
    console.error('Error: Invalid category selection');
    process.exit(1);
  }

  const category = categories[categoryIndex];

  // Prompt for author name
  const authorName = await question('Author name: ');

  if (!authorName.trim()) {
    console.error('Error: Author name is required');
    process.exit(1);
  }

  // Generate slug from title
  const slug = slugify(title);

  // Get current date/time
  const dateTime = getCurrentDateTime();

  // Build the frontmatter
  const frontmatter = `---
title: "${title}"
teaser: "[Add teaser here]"
category: "${category}"
image: "~/assets/images/blog/placeholder.png"
description: "[Add description here]"
canonicalUrl: "/blog/${slug}"
section: "${category}"
ogSiteName: "Ludi"
ogType: "article"
ogUrl: https://ludi.co/blog/${slug}
ogImageUrl: "~/assets/images/blog/placeholder.png"
ogImageWidth: 1200
ogImageHeight: 628
ogImageAlt: "${title}"
ogImageType: "image/png"
publishedDate: ${dateTime}
modifiedDate: ${dateTime}
authorName: "${authorName}"
---

Write the article here
`;

  // Create the file
  const blogDir = path.join(__dirname, '..', 'src', 'content', 'blog');

  const filename = `${slug}.md`;

  const filepath = path.join(blogDir, filename);

  // Check if file already exists
  if (fs.existsSync(filepath)) {
    console.error(`\nError: File already exists at ${filepath}`);
    process.exit(1);
  }

  // Write the file
  fs.writeFileSync(filepath, frontmatter);

  console.log(`\n✓ Blog post created successfully!`);
  console.log(`  File: src/content/blog/${filename}`);
  console.log(`  URL: /blog/${slug}`);
  console.log(`\nDon't forget to:`);
  console.log(`  - Add teaser text`);
  console.log(`  - Add description`);
  console.log(`  - Update the image if needed`);
  console.log(`  - Write the article content`);

  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
