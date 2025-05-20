/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { kebabCase } from "change-case";
import slugify from "slugify";

const bearer = "7d3383ed-0f0a-4604-9b9b-848e449820bb";

const anthropic = new Anthropic();

const load = async () => {
    const response = await fetch("https://metroretro.io/api/v2/templates.list2", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${bearer}`,
        },
    });

    return await response.json();
};

const generateMetadata = async (tag: string, templates: any[]) => {

    const msg = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1024 * 4,
        system: [
            'You are a helpful SEO expert.',
            'You are helping generate SEO metadata for the application Metro Retro, a collaborative whiteboard tool for dev teams.',
            'You are given a tag used to categories templates within the application, and the metadata about the templates in this tag',
            'You are to generate a page title, heading (H1) and short description for the tag.',
            'The page title should be 60 characters or less.',
            'The page title should be SEO friendly.',
            'The heading (H1) should be 3-8 words',
            'The description should be not more than 160 chars.',
            'The description should sell our application based on the quality of the templates available in the category.',
            'Prefer "Retrospective" over "Retro".',
            '| Metro Retro will be appended by the application, so do not include it in the page title.',
            'Do not use colons (:) or semicolons (;) in the title or heading (H1).',
            'Return a JSON object with the following format: { pageTitle: string, heading: string, description: string }',
        ].join('\n'),
        messages: [
            {
                role: "user", content: `
                Tag: ${tag}

                Templates: ${JSON.stringify(templates)}
            ` }
        ],
    });

    if (msg.content[0].type === 'text') {

        // Handle ```JSON
        const text = msg.content[0].text;

        const json = text.replace(/^```json\n/, '').replace(/\n```$/, '');

        return JSON.parse(json);

    } else {
        console.error('Unexpected message content type:', msg.content[0]);
    }
}

const main = async () => {
    const templates = await load();

    const tags = new Set(templates.flatMap((x: any) => x.tags).map((x: any) => x.label));

    const results = [] as any[];

    for (const t of tags) {
        const list = templates.filter((x: any) => !!x.tags.find((u: any) => u.label === t));

        const result = await generateMetadata(t as any, list);

        console.dir(result);

        results.push({ tag: { label: t, slug: kebabCase(t as string).toLowerCase() }, ...result });
    }



    // Write to file
    fs.writeFileSync("./data/template-tags.json", JSON.stringify(results, null, 2));

};

main();