import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import axios from 'axios';
import { Parser } from 'xml2js';

const apiKey = 'ee0f44a4a39b47ac9d27faf070e4be72';

const username = 'omgjingles';

const clientIp = '159.65.56.185';

if (!apiKey || !username) {
    console.error('Please set NAMECHEAP_API_KEY, NAMECHEAP_USERNAME, and NAMECHEAP_CLIENT_IP environment variables.');
    process.exit(1);
}

const tlds = ['.com', '.io', '.co', '.dev', '.app', '.sh'];

async function checkDomainAvailability(domainName: string, tld: string): Promise<unknown> {
    const baseUrl = 'https://api.namecheap.com/xml.response';

    const command = 'namecheap.domains.check';

    const params = {
        ApiUser: username,
        ApiKey: apiKey,
        UserName: username,
        DomainList: `${domainName}${tld}`,
        ClientIp: clientIp
    };

    const url = `${baseUrl}?Command=${command}&${Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')}`;

    try {
        const response = await axios.get(url);

        const xml = response.data;

        const parser = new Parser({
            ignoreAttrs: false,
        });

        const result = await parser.parseStringPromise(xml);

        const domainCheckResult = (result as any)?.ApiResponse?.CommandResponse?.[0]?.DomainCheckResult?.[0]?.['$'] as any;

        if (!domainCheckResult) throw new Error('No result');
        const isAvailable = domainCheckResult.Available === "true";

        const isPremium = domainCheckResult.IsPremiumName === "true";

        const price = isAvailable ? domainCheckResult.PremiumRegistrationPrice : "N/A";

        return {
            tld: tld,
            available: isAvailable,
            premium: isPremium,
            price: price,
        };
    } catch (error: unknown) {
        console.error(`Error checking ${domainName}${tld}: ${error}`);

        return {
            tld: tld,
            available: false,
            premium: false,
            price: "N/A",
        };
    }
}

async function main() {
    const domainNames = fs.readFileSync('./scripts/domains.txt', 'utf-8').split('\n').map(domain => domain.trim()).filter(domain => domain !== '');

    for (const domainName of domainNames) {
        console.log(`Checking domain: ${domainName}`);
        for (const tld of tlds) {
            const result = await checkDomainAvailability(domainName, tld) as { tld: string; available: boolean; premium: boolean; price: string; };

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
}

main();