/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { kebabCase } from "change-case";
import slugify from "slugify";

const bearer = "7d3383ed-0f0a-4604-9b9b-848e449820bb";

const load = async () => {
    const response = await fetch("https://ludi.co/api/v2/templates.list2", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${bearer}`,
        },
    });

    return await response.json();
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
    console.log('Fetching templates from API...');
    const allTemplates = await load();

    // Filter out custom templates (those with accountId)
    const templates = allTemplates.filter((t: any) => !t.accountId);

    const filteredCount = allTemplates.length - templates.length;

    if (filteredCount > 0) {
        console.log(`Filtered out ${filteredCount} custom templates (with accountId)`);
    }

    slugifyAliases(templates);
    kebabizeTags(templates);

    // Write to file
    fs.writeFileSync("./data/templates.json", JSON.stringify(templates, null, 2));

    console.log(`✓ Fetched and saved ${templates.length} templates to data/templates.json`);
};

main();
