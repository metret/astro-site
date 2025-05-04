import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Crawl the website starting from the homepage
const crawlSite = async (baseUrl: string): Promise<string[]> => {
    const visited = new Set<string>();

    const queue: string[] = ['/'];

    const foundUrls: string[] = [];

    while (queue.length > 0) {
        const currentPath = queue.shift()!;

        const fullUrl = new URL(currentPath, baseUrl).toString();

        if (visited.has(currentPath)) continue;
        visited.add(currentPath);

        try {
            const response = await fetch(fullUrl);

            // Only add URLs with 200 OK responses to foundUrls
            if (response.status === 200) {
                foundUrls.push(currentPath);

                const html = await response.text();

                const $ = cheerio.load(html);

                // Find all links in the page
                $('a').each((_, element) => {
                    const href = $(element).attr('href');

                    if (!href) return;

                    try {
                        // Parse the URL to get just the pathname
                        const parsedUrl = new URL(href, baseUrl);

                        if (parsedUrl.hostname === new URL(baseUrl).hostname) {
                            const normalizedPath = parsedUrl.pathname;

                            if (!visited.has(normalizedPath) && !queue.includes(normalizedPath)) {
                                queue.push(normalizedPath);
                            }
                        }
                    } catch (e) {
                        console.error(`Error parsing URL ${href}:`, e);
                    }
                });
            }
        } catch (error) {
            console.error(`Error fetching ${fullUrl}:`, error);
        }
    }

    return foundUrls;
};

// Load the missing URLs from the JSON file
const loadMissingUrls = (): string[] => {
    const filePath = path.join(process.cwd(), 'data', 'missing.json');

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

// Function to suggest redirects for missing URLs
const suggestRedirectForBatch = async (knownUrls: string[], missingUrls: string[]) => {

    const msg = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1024 * 2,
        system: [
            'You are a helpful SEO expert.',
            'You will be provided with a list of WORKING urls, and a small list of MISSING urls.',
            'The missing urls are all 404 errors, and the working urls are all 200 OK responses.',
            'For each missing url, suggest a redirect to a working url that we can redirect to.',
            'Return a JSON array of objects with the following format: { missing: string, redirect: string }',
        ].join('\n'),
        messages: [
            { role: "user", content: `WORKING: ${JSON.stringify(knownUrls)}\n\nMISSING: ${JSON.stringify(missingUrls)}` }
        ],
    });

    if (msg.content[0].type === 'text') {
        const text = msg.content[0].text;

        console.log(text);

        // extract the contents of the ```json block
        const json = text.match(/```json\n([\s\S]*)\n```/)?.[1];

        if (!json) {
            console.error('No JSON found in the response');

            return;
        }

        return JSON.parse(json);
    } else {
        console.error('Unexpected message content type:', msg.content[0]);

        return null;
    }
};

// Main function that orchestrates the process
const main = async () => {
    try {
        console.log('Starting the URL crawling process...');
        const baseUrl = 'http://localhost:4321';

        const knownUrls = await crawlSite(baseUrl);

        console.log(`Found ${knownUrls.length} URLs on the site.`);

        console.log('Loading missing URLs...');
        const missingUrls = loadMissingUrls();

        console.log(`Loaded ${missingUrls.length} missing URLs.`);

        console.log('Suggesting redirects...');
        // Process in batches of 10
        const batchSize = 20;

        const suggestions = [] as { missing: string, redirect: string }[];

        for (let i = 0; i < missingUrls.length; i += batchSize) {
            const batch = missingUrls.slice(i, i + batchSize);

            console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(missingUrls.length / batchSize)}`);

            const result = await suggestRedirectForBatch(knownUrls, batch);

            if (result) {
                suggestions.push(...result);
            }
        }

        // Write to ./data/redirect-suggestions.json
        const mappings = Object.fromEntries(suggestions.map(({ missing, redirect }) => [missing, redirect]));

        fs.writeFileSync(path.join(process.cwd(), 'data', 'redirect-suggestions.json'), JSON.stringify(mappings, null, 2));

        console.log('Process completed.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
};

// Run the script
main();
