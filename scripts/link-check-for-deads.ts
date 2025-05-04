/* eslint-disable no-console */
import fs from 'fs';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'http://localhost:4321';

const OUTPUT_FILE = './data/dead-link-report.json';

const INPUT_FILE = './data/paths.json';

// URLs starting with these patterns will be ignored during checks
const IGNORE_PATTERNS: RegExp[] = [
    /\/BO.*/,  // Example: ignore routes starting with /BO
    /\/bo.*/,  // Example: ignore routes starting with /bo
    /\/TP.*/,  // Example: ignore routes starting with /TP
    /\/tp.*/,  // Example: ignore routes starting with /tp
    /\.setup/,
    /\/account.*/,
    /\/login.*/,
];

// List of modern Chrome User-Agent strings
const CHROME_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// Get a random Chrome User-Agent
const getRandomUserAgent = () => CHROME_USER_AGENTS[Math.floor(Math.random() * CHROME_USER_AGENTS.length)];

// Common fetch options to mimic Chrome
const getFetchOptions = (referrer?: string) => ({
    timeout: 10000, // 10 second timeout
    headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': referrer ? 'same-origin' : 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        ...(referrer ? { 'Referer': referrer } : {})
    }
});

// Define response type for better type safety
type LinkCheckResult = {
    url: string;
    status: number;
    statusText?: string;
    sourceUrl?: string; // Source page where the link was found
    success: boolean; // Flag to indicate if this is a successful response or an error
};

// Cache for already checked URLs
const linkCache: Map<string, LinkCheckResult> = new Map();

// Counter for skipped links (due to ignore patterns)
let skippedLinksCount = 0;

/**
 * Check if a URL should be ignored based on IGNORE_PATTERNS
 */
const shouldIgnoreUrl = (url: string): boolean => {
    const shouldIgnore = IGNORE_PATTERNS.some(pattern => pattern.test(url));

    if (shouldIgnore) {
        skippedLinksCount++;
    }

    return shouldIgnore;
};

/**
 * Check if a URL is valid and returns a 200 or 300 status code
 */
const checkSingleUrl = async (url: string, sourceUrl?: string): Promise<LinkCheckResult> => {
    // Check if this URL should be ignored
    if (shouldIgnoreUrl(url)) {
        console.log(`Ignoring link (matches ignore pattern): ${url}`);

        return {
            url,
            status: 0,
            statusText: 'Ignored due to pattern match',
            sourceUrl,
            success: true
        };
    }

    // Check if this URL has already been verified
    if (linkCache.has(url)) {
        const cachedResult = linkCache.get(url)!;

        // Return the cached result but update the source URL if needed
        return {
            ...cachedResult,
            sourceUrl: sourceUrl || cachedResult.sourceUrl
        };
    }

    try {
        const response = await fetch(url, getFetchOptions(sourceUrl));

        // Create result with actual status code
        const result: LinkCheckResult = {
            url,
            status: response.status,
            statusText: response.statusText,
            sourceUrl,
            success: response.status < 400 || response.status === 403 // Success if status is less than 400 or if 403
        };

        // Cache the result
        linkCache.set(url, result);

        // Return the result
        return result;
    } catch (error) {
        const result = {
            url,
            status: 0,
            statusText: error instanceof Error ? error.message : 'Unknown error',
            sourceUrl,
            success: false
        };

        linkCache.set(url, result);
        console.error(`Error checking ${url}:`, error);

        return result;
    }
};

/**
 * Normalize a URL based on the source URL
 */
const normalizeUrl = (href: string, baseUrl: string): string => {
    try {
        // Handle absolute URLs
        if (href.startsWith('http://') || href.startsWith('https://')) {
            return href;
        }

        // Handle absolute paths
        if (href.startsWith('/')) {
            return new URL(href, BASE_URL).toString();
        }

        // Handle relative paths
        return new URL(href, baseUrl).toString();
    } catch (error) {
        console.error(`Error normalizing URL ${href}:`, error);

        return '';
    }
};

/**
 * Crawl a page and check all links found on it
 */
const crawlAndCheckLinks = async (pagePath: string): Promise<LinkCheckResult[]> => {
    const pageUrl = pagePath.startsWith('/') ? pagePath.slice(1) : pagePath;

    const fullUrl = `${BASE_URL}/${pageUrl}`;

    const errors: LinkCheckResult[] = [];

    // Skip pages that should be ignored
    if (shouldIgnoreUrl(fullUrl)) {
        console.log(`Ignoring page (matches ignore pattern): ${fullUrl}`);

        return errors;
    }

    console.log(`Crawling: ${fullUrl}`);

    try {
        // Fetch the page
        const response = await fetch(fullUrl, getFetchOptions(fullUrl));

        if (!response.ok) {
            console.error(`Failed to fetch page ${fullUrl}: ${response.status} ${response.statusText}`);
            errors.push({
                url: fullUrl,
                status: response.status,
                statusText: response.statusText,
                success: false
            });

            return errors;
        }

        const html = await response.text();

        const $ = cheerio.load(html);

        // Find all links on the page
        const links = new Set<string>();

        $('a[href]').each((_, element) => {
            const href = $(element).attr('href');

            if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                const normalizedUrl = normalizeUrl(href, fullUrl);

                if (normalizedUrl && !shouldIgnoreUrl(normalizedUrl)) {
                    links.add(normalizedUrl);
                }
            }
        });

        console.log(`Found ${links.size} links on ${fullUrl}`);

        // Check each linkF
        for (const link of links) {

            const result = await checkSingleUrl(link, fullUrl);

            if (!result.success) {
                errors.push(result);
                console.log(`${result.status}: ${result.statusText} - ${result.url}`);
            }
        }

        return errors;
    } catch (error) {
        console.error(`Error crawling ${fullUrl}:`, error);
        errors.push({
            url: fullUrl,
            status: 0,
            statusText: error instanceof Error ? error.message : 'Unknown error',
            success: false
        });

        return errors;
    }
};

/**
 * Main function to load links and check them
 */
const main = async (): Promise<void> => {
    console.log(`Loading pages from ${INPUT_FILE}`);

    try {
        // Ensure the file exists
        if (!fs.existsSync(INPUT_FILE)) {
            console.error(`Error: ${INPUT_FILE} does not exist. Run the crawler first.`);
            process.exit(1);
        }

        // Load the links from the JSON file
        const allPages = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8')) as string[];

        // Filter out pages that match ignore patterns
        const pages = allPages.filter(page => !shouldIgnoreUrl(page.startsWith('/') ? new URL(page, BASE_URL).toString() : page));

        console.log(`Loaded ${allPages.length} pages, checking ${pages.length} after filtering ignore patterns. Starting crawl and link check...`);

        // Check all pages
        const allResults: LinkCheckResult[] = [];

        for (const page of pages) {
            const pageResults = await crawlAndCheckLinks(page);

            allResults.push(...pageResults);

        }

        // Filter for errors (non-successful responses)
        const allErrors = allResults.filter(result => !result.success);

        // Report results
        if (allErrors.length === 0) {
            console.log('\n✅ All links are valid! No errors found.');
            console.log(`Checked ${linkCache.size} unique links total. Skipped ${skippedLinksCount} links matching ignore patterns.`);
        } else {
            console.log('\n❌ ---- DEAD LINKS ----');

            // Create a map to deduplicate errors by URL
            const uniqueErrors = new Map<string, LinkCheckResult>();

            allErrors.forEach(error => {
                if (!uniqueErrors.has(error.url)) {
                    uniqueErrors.set(error.url, error);
                } else {
                    // If this URL has already been seen, merge the source URLs
                    const existingError = uniqueErrors.get(error.url)!;

                    if (error.sourceUrl && existingError.sourceUrl &&
                        !existingError.sourceUrl.includes(error.sourceUrl)) {
                        existingError.sourceUrl += `, ${error.sourceUrl}`;
                    } else if (error.sourceUrl && !existingError.sourceUrl) {
                        existingError.sourceUrl = error.sourceUrl;
                    }
                }
            });

            // Print the unique errors
            Array.from(uniqueErrors.values()).forEach(error => {
                const statusText = error.status === 0
                    ? `CONNECTION ERROR: ${error.statusText}`
                    : `HTTP ${error.status} ${error.statusText || ''}`;

                console.log(`${statusText}: ${error.url}${error.sourceUrl ? ` (found on ${error.sourceUrl})` : ''}`);
            });

            console.log(`\nFound ${uniqueErrors.size} unique dead links across ${pages.length} pages checked.`);

            // Group links by status code
            const statusCodeStats = new Map<number, number>();

            Array.from(linkCache.values()).forEach(result => {
                const count = statusCodeStats.get(result.status) || 0;

                statusCodeStats.set(result.status, count + 1);
            });

            // Output status code statistics
            console.log("\nStatus code statistics:");
            Array.from(statusCodeStats.entries())
                .sort((a, b) => a[0] - b[0])
                .forEach(([status, count]) => {
                    console.log(`  ${status}: ${count} links`);
                });

            console.log(`Checked ${linkCache.size} unique links total. Skipped ${skippedLinksCount} links matching ignore patterns.`);

            // Write errors to the output file
            fs.writeFileSync(
                OUTPUT_FILE,
                JSON.stringify(
                    Array.from(uniqueErrors.values()).map(error => ({
                        url: error.url,
                        sourceUrl: error.sourceUrl
                    })),
                    null,
                    2
                )
            );
            console.log(`Errors written to ${OUTPUT_FILE}`);
        }
    } catch (error) {
        console.error('Link check failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
};

// Execute the main function
main();
