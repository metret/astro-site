/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { kebabCase } from "change-case";
import slugify from "slugify";

const bearer = "178c1246-7746-46d9-a0f7-6b29cb369828";

const load = async () => {
    try {
        console.log('Making API request to https://ludi.co/api/v2/templates.list2...');
        const response = await fetch("https://ludi.co/api/v2/templates.list2", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${bearer}`,
            },
        });

        console.log(`Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Successfully parsed JSON data with ${data.length} templates`);
        return data;
    } catch (error) {
        console.error('Error in load function:');
        if (error instanceof Error) {
            console.error(`  Message: ${error.message}`);
            console.error(`  Stack: ${error.stack}`);
        } else {
            console.error(`  Unknown error: ${error}`);
        }
        throw error;
    }
};

const slugifyAliases = (templates: Record<string, any>[]) => {
    for (const tmpl of templates) {
        tmpl.alias = slugify(tmpl.alias, { lower: true });
        // Remove )
        tmpl.alias = tmpl.alias.replace(/\)/g, '');
        // Remove (
        tmpl.alias = tmpl.alias.replace(/\(/g, '');
        // Remove :
        tmpl.alias = tmpl.alias.replace(/:/g, '');
    }
};

const kebabizeTags = (templates: Record<string, any>[]) => {
    for (const tmpl of templates) {
        for (const tag of tmpl.tags) {
            tag.name = kebabCase(tag.name).toLowerCase();
        }
    }
};

const main = async () => {
    try {
        console.log('Fetching templates from API...');
        const allTemplates = await load();

        if (!Array.isArray(allTemplates)) {
            throw new Error(`Expected array of templates, got: ${typeof allTemplates}`);
        }

        console.log(`Received ${allTemplates.length} total templates`);

        // Filter out custom templates (those with accountId)
        const templates = allTemplates.filter((t: any) => !t.accountId);

        const filteredCount = allTemplates.length - templates.length;

        if (filteredCount > 0) {
            console.log(`Filtered out ${filteredCount} custom templates (with accountId)`);
        }

        console.log('Processing template aliases and tags...');
        slugifyAliases(templates);
        kebabizeTags(templates);

        // Write to file
        console.log('Writing to ./data/templates.json...');
        fs.writeFileSync("./data/templates.json", JSON.stringify(templates, null, 2));

        console.log(`✓ Fetched and saved ${templates.length} templates to data/templates.json`);
    } catch (error) {
        console.error('\n❌ Failed to fetch templates:');
        if (error instanceof Error) {
            console.error(`  ${error.message}`);
        } else {
            console.error(`  ${error}`);
        }
        process.exit(1);
    }
};

main();
