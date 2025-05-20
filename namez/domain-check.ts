/* eslint-disable @typescript-eslint/no-explicit-any */
import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Parser } from 'xml2js';
import * as readline from 'readline';

const apiKey = 'ee0f44a4a39b47ac9d27faf070e4be72';

const username = 'omgjingles';

const clientIp = '159.65.56.185';

if (!apiKey || !username) {
    console.error('Please set NAMECHEAP_API_KEY, NAMECHEAP_USERNAME, and NAMECHEAP_CLIENT_IP environment variables.');
    process.exit(1);
}

const tlds = ['.com'];

// Define interfaces for the XML response structure
interface DomainResult {
    domain: string;
    tld: string;
    available: boolean;
    premium: boolean;
    price: string;
}

interface DomainCheckResultAttribute {
    Domain: string;
    Available: string;
    IsPremiumName: string;
    PremiumRegistrationPrice?: string;
}

interface DomainCheckResultItem {
    $: DomainCheckResultAttribute;
}

interface ApiCommandResponse {
    DomainCheckResult?: DomainCheckResultItem[];
}

interface ApiResponse {
    ApiResponse: {
        Errors: any[],
        CommandResponse?: [ApiCommandResponse];
    };
}

async function checkDomainAvailability(domainCombinations: { name: string, tld: string }[]): Promise<DomainResult[]> {
    const baseUrl = 'https://api.namecheap.com/xml.response';

    const command = 'namecheap.domains.check';

    // Create a comma-separated list of domains
    const domainList = domainCombinations.map(combo => `${combo.name}${combo.tld}`).join(',');

    const params = {
        ApiUser: username,
        ApiKey: apiKey,
        UserName: username,
        DomainList: domainList,
        ClientIp: clientIp
    };

    const url = `${baseUrl}?Command=${command}&${Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')}`;

    try {
        const response = await axios.get(url);

        console.log(response.status)

        const xml = response.data;

        const parser = new Parser({
            ignoreAttrs: false,
        });

        const result = await parser.parseStringPromise(xml) as ApiResponse;

        const errors = result?.ApiResponse?.Errors?.filter(x => !!x) ?? [];

        if (errors.length > 0) {
            console.dir(result?.ApiResponse?.Errors, { depth: null });
            throw new Error('API Error');
        }

        const domainCheckResults = result?.ApiResponse?.CommandResponse?.[0]?.DomainCheckResult || [];

        if (!domainCheckResults.length) throw new Error('No results');

        return domainCheckResults.map((checkResult: DomainCheckResultItem, index: number) => {
            const domainData = checkResult['$'];

            const fullDomain = domainData.Domain || '';

            const combo = domainCombinations[index];

            const isAvailable = domainData.Available === "true";

            const isPremium = domainData.IsPremiumName === "true";

            // Ensure price is always a string, even when PremiumRegistrationPrice is undefined
            const price = isAvailable ? (domainData.PremiumRegistrationPrice || "N/A") : "N/A";

            return {
                domain: combo.name,
                tld: combo.tld,
                available: isAvailable,
                premium: isPremium,
                price: price,
            };
        });
    } catch (error: unknown) {
        console.error(`Error checking batch of domains: ${error}`);
        throw error;
    }
}

// Helper function to chunk an array into groups of specified size
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }

    return chunks;
}

// Function to list files in a directory
function listFilesInDirectory(directoryPath: string): string[] {
    try {
        return fs.readdirSync(directoryPath)
            .filter(file => fs.statSync(path.join(directoryPath, file)).isFile());
    } catch (error) {
        console.error(`Error reading directory ${directoryPath}: ${error}`);

        return [];
    }
}

// Function to create an interactive menu for file selection
async function selectFileFromMenu(files: string[]): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('Available files:');
        files.forEach((file, index) => {
            console.log(`${index + 1}. ${file}`);
        });

        rl.question('Select a file by number: ', (answer) => {
            rl.close();
            const selection = parseInt(answer.trim(), 10);

            if (isNaN(selection) || selection < 1 || selection > files.length) {
                console.log('Invalid selection, using the first file.');
                resolve(files[0]);
            } else {
                resolve(files[selection - 1]);
            }
        });
    });
}

async function main() {
    // List .txt files in the current directory (namez)
    const currentDir = path.resolve('./');

    const allFiles = listFilesInDirectory(currentDir);

    const txtFiles = allFiles.filter(file => file.endsWith('.txt'));

    if (txtFiles.length === 0) {
        console.error('No .txt files found in the current directory.');
        process.exit(1);
    }

    // Present menu for file selection
    const selectedFile = await selectFileFromMenu(txtFiles);

    console.log(`Selected file: ${selectedFile}`);

    // Read domains from the selected file
    const filePath = path.join(currentDir, selectedFile);

    const domainNames = fs.readFileSync(filePath, 'utf-8')
        .split('\n')
        .map(x => x.split('-')[0])
        .map(domain => domain.trim())
        .filter(domain => domain !== '');

    console.log(`Loaded ${domainNames.length} domains from ${selectedFile}`);

    // Create all domain+TLD combinations
    const allCombinations: { name: string, tld: string }[] = [];

    for (const domainName of domainNames) {
        for (const tld of tlds) {
            allCombinations.push({ name: domainName, tld });
        }
    }

    // Batch combinations into groups 
    const batchSize = 50;

    const batches = chunkArray(allCombinations, batchSize);

    console.log(`Processing ${allCombinations.length} domain combinations in ${batches.length} batches of up to ${batchSize}`);

    // Store results for file output
    const allResults: DomainResult[] = [];

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} domains)`);

        const results = await checkDomainAvailability(batch);

        allResults.push(...results);

        // Every 10, wait for 5 seconds
        if ((i + 1) % 10 === 0) {
            console.log('Waiting 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Display results
        for (const result of results) {
            const domainName = result.domain;

            const tld = result.tld;

            if (result.premium) {
                console.log(`  ${domainName}${tld} -> \x1b[32mpremium\x1b[0m`);
            }
            else if (result.available) {
                console.log(`  ${domainName}${tld} -> \x1b[32mavailable\x1b[0m`);
            } else {
                console.log(`  ${domainName}${tld} is \x1b[31mnot available\x1b[0m.`);
            }
        }
    }

    // Write results to file
    const outputFileName = `domains-for.${path.basename(selectedFile)}`;

    const outputContent = allResults.map(result => {
        const status = result.premium ? 'premium' : (result.available ? 'available' : 'not available');

        return `${result.domain}${result.tld}: ${status}${result.premium ? ` (Price: ${result.price})` : ''}`;
    }).join('\n');

    fs.writeFileSync(outputFileName, outputContent);
    console.log(`Results written to ${outputFileName}`);
}

main();