/* eslint-disable no-console */
import fs from 'fs';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4321';

const OUTPUT_FILE = './data/missing.json';

const INPUT_FILE = './data/paths.json';

// Define response type for better type safety
type LinkCheckResult = {
    url: string;
    status: number;
    statusText?: string;
};

/**
 * Check a single URL and return any error information
 */
const checkUrl = async (url: string): Promise<LinkCheckResult | null> => {
    try {
        url = url.startsWith('/') ? url.slice(1) : url;

        console.log(`Checking: ${url}`);
        const response = await fetch(`${BASE_URL}/${url}`, {
            timeout: 10000, // 10 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 LinkChecker'
            }
        });

        // Only report errors (4xx or 5xx)
        if (response.status >= 400) {
            return {
                url,
                status: response.status,
                statusText: response.statusText
            };
        }

        return null; // No error
    } catch (error) {
        console.error(`Error checking ${url}:`, error);

        return {
            url,
            status: 0,
            statusText: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

/**
 * Main function to load links and check them
 */
const main = async (): Promise<void> => {
    console.log(`Loading links from ${INPUT_FILE}`);

    try {
        // Ensure the file exists
        if (!fs.existsSync(INPUT_FILE)) {
            console.error(`Error: ${INPUT_FILE} does not exist. Run the crawler first.`);
            process.exit(1);
        }

        // Load the links from the JSON file
        const links = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8')) as string[];

        console.log(`Loaded ${links.length} URLs. Checking for errors...`);

        // Check all links concurrently with Promise.all
        const results = [] as LinkCheckResult[];

        for (const link of links) {
            const result = await checkUrl(link);

            if (result) {
                results.push(result);
                console.log(`${result.status}: ${result.statusText}`);
            }
            else {
                console.log(`200 OK`);
            }
        }

        // Filter out null results (successful requests)
        const errors = results.filter((result): result is LinkCheckResult => result !== null);

        // Report results
        if (errors.length === 0) {
            console.log('\n✅ All links are valid! No errors found.');
        } else {
            console.log('\n❌ ---- LINK ERRORS ----');
            errors.forEach(error => {
                const statusText = error.status === 0
                    ? `CONNECTION ERROR: ${error.statusText}`
                    : `HTTP ${error.status} ${error.statusText || ''}`;

                console.log(`${statusText}: ${error.url}`);
            });
            console.log(`\nFound ${errors.length} errors out of ${links.length} links checked.`);

            // Write errors to missing.json file
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(errors.map(error => error.url), null, 2));
            console.log(`Errors written to ${OUTPUT_FILE}`);
        }
    } catch (error) {
        console.error('Link check failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
};

// Execute the main function
main();
