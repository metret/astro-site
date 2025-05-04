/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

// Default domains to crawl
const DEFAULT_DOMAINS = [
    'http://localhost:4321',
    'https://metroretro.io'
];

// Allow domain list to be passed as command line arguments
const DOMAINS_TO_CRAWL = process.argv.length > 2
    ? process.argv.slice(2)
    : DEFAULT_DOMAINS;

const OUTPUT_FILE = './data/paths.json';

// Regex patterns for URLs to ignore
const IGNORE_PATTERNS: RegExp[] = [
    /\/BO.*/,  // Example: ignore routes starting with /BO
    /\/bo.*/,  // Example: ignore routes starting with /bo
    /\/TP.*/,  // Example: ignore routes starting with /TP
    /\/tp.*/,  // Example: ignore routes starting with /tp
    /\.setup/,
    /\/account.*/,
    /\/login.*/,
];

// Keep track of visited URLs (full URLs including domain)
const visitedUrls = new Set<string>();

// Keep track of discovered paths (without domain)
const discoveredPaths = new Set<string>();

const normalizeUrl = (url: string, baseUrl: string): string => {
    try {
        const urlObj = new URL(url, baseUrl);

        // Remove hash fragments and normalize path
        urlObj.hash = '';
        // Remove query parameters
        urlObj.search = '';
        // Ensure trailing slash consistency
        if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
        }

        return urlObj.toString();
    } catch (error) {
        console.error(`Error normalizing URL: ${url}`, error);

        return '';
    }
};

// Extract just the path from a URL
const extractPath = (url: string): string => {
    try {
        const urlObj = new URL(url);

        let pathname = urlObj.pathname;

        // Ensure trailing slash consistency
        if (pathname !== '/' && pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }

        return pathname;
    } catch (error) {
        console.error(`Error extracting path from URL: ${url}`, error);

        return '';
    }
};

// Check if a URL should be ignored based on ignore patterns
const shouldIgnoreUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);

        const pathname = urlObj.pathname;

        return IGNORE_PATTERNS.some(pattern => pattern.test(pathname));
    } catch (error) {
        return false;
    }
};

// Check if a URL belongs to one of our domains to crawl
const isInDomainsToCheck = (url: string): boolean => {
    try {
        const urlObj = new URL(url);

        const urlOrigin = urlObj.origin;

        return DOMAINS_TO_CRAWL.some(domain => {
            const domainObj = new URL(domain);

            return domainObj.origin === urlOrigin;
        });
    } catch (error) {
        return false;
    }
};

// Extract all links from HTML content
const extractLinks = (html: string, baseUrl: string): string[] => {
    const $ = cheerio.load(html);

    const links: string[] = [];

    $('a[href]').each((_: number, element: cheerio.Element) => {
        const href = $(element).attr('href');

        if (href) {
            const normalizedUrl = normalizeUrl(href, baseUrl);

            if (normalizedUrl && isInDomainsToCheck(normalizedUrl) && !shouldIgnoreUrl(normalizedUrl)) {
                links.push(normalizedUrl);
            }
        }
    });

    return links;
};

// Crawl a single URL and extract links
const crawlUrl = async (url: string): Promise<void> => {
    // Skip if already visited or should be ignored
    if (visitedUrls.has(url) || shouldIgnoreUrl(url)) {
        return;
    }

    console.log(`Crawling: ${url}`);
    visitedUrls.add(url);

    // Extract and store the path
    const path = extractPath(url);

    if (path) {
        discoveredPaths.add(path);
    }

    try {
        const response = await fetch(url);

        const contentType = response.headers.get('content-type') || '';

        // Only process HTML content
        if (!contentType.includes('text/html')) {
            return;
        }

        const html = await response.text();

        const links = extractLinks(html, url);

        // Process each discovered link
        for (const link of links) {
            if (!visitedUrls.has(link)) {
                await crawlUrl(link);
            }
        }
    } catch (error) {
        console.error(`Error crawling ${url}:`, error);
    }
};

// Ensure the output directory exists
const ensureDirectoryExists = (filePath: string): void => {
    const dirname = path.dirname(filePath);

    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
    }
};

// Main function to start the crawl
const main = async (): Promise<void> => {
    console.log(`Starting crawl of domains: ${DOMAINS_TO_CRAWL.join(', ')}`);

    try {
        // Crawl each domain
        for (const domain of DOMAINS_TO_CRAWL) {
            console.log(`Crawling domain: ${domain}`);
            await crawlUrl(domain);
        }

        console.log(`Crawl complete. Found ${discoveredPaths.size} unique paths.`);

        // Convert set to sorted array
        const pathsArray = Array.from(discoveredPaths).sort();

        // Save results to JSON file
        ensureDirectoryExists(OUTPUT_FILE);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pathsArray, null, 2));

        console.log(`Paths saved to ${OUTPUT_FILE}`);
    } catch (error) {
        console.error('Crawl failed:', error);
    }
};

// Execute the main function
main();
