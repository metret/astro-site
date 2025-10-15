/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import slugify from "slugify";

const anthropic = new Anthropic();

const generateTitles = async (templates: any[]) => {

    const data = templates.map((t: any) => [t.alias, t.label, t.tags[0]?.label, t.tags[1]?.label, t.tags[2]?.label]);

    const results = [] as any[];

    const processBlock = async (items: any[]) => {

        const itemsWithHeader = [
            ["alias", "label", "tag1", "tag2", "tag3"],
            ...items
        ];

        const csv = itemsWithHeader.map(row => row.map((x: any) => `"${x}"`).join(",")).join("\n");

        const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 1024 * 4,
            system: [
                'You are a helpful SEO expert.',
                'You are helping generate SEO metadata for the application Ludi, a collaborative whiteboard tool for dev teams.',
                'You are given a list of templates and their tags.',
                'You are to generate a page title for each template\'s respective website page.',
                'The title should be 60 characters or less.',
                'The title should be SEO friendly.',
                'Prefer "Retrospective" over "Retro".',
                '| Ludi will be appended by the application, so do not include it in the title.',
                'Where the title doesn\'t indicate the template type, add the type to the title.',
                'Where the title uses /, replace with comma or format nicely.',
                'If the existing title starts with "The", do not omit it.',
                'Do not use colons (:) or semicolons (;) in the title.',
                'Return a JSON array of objects with the following format: { alias: string, title: string }',
            ].join('\n'),
            messages: [
                { role: "user", content: csv }
            ],
        });

        if (msg.content[0].type === 'text') {

            // Handle ```JSON
            const text = msg.content[0].text;

            const json = text.replace(/^```json\n/, '').replace(/\n```$/, '');

            results.push(...JSON.parse(json));
        } else {
            console.error('Unexpected message content type:', msg.content[0]);
        }
    }

    // Look in blocks of 40
    const bs = 40;

    for (let i = 0; i < data.length; i += bs) {
        console.log(`Processing block ${i / bs + 1} of ${Math.ceil(data.length / bs)}`);
        await processBlock(data.slice(i, i + bs));
    }

    // Check all items have results
    const missing = data.filter((x: any) => !results.find((y: any) => y.alias === x[0]));

    if (missing.length > 0) {
        console.log(`Processing ${missing.length} missing items`);
        await processBlock(missing);
    }

    return results;
}

const main = async () => {
    // Load templates from local file
    console.log('Loading templates from data/templates.json...');
    const templates = JSON.parse(fs.readFileSync('./data/templates.json', 'utf8'));

    // Load existing SEO data from template-seo.json
    const seoDataPath = './data/template-seo.json';
    let existingSeoData: any[] = [];

    if (fs.existsSync(seoDataPath)) {
        console.log('Loading existing SEO data from template-seo.json');
        existingSeoData = JSON.parse(fs.readFileSync(seoDataPath, 'utf8'));
    }

    // Create a set of existing templateIds for quick lookup
    const existingIds = new Set(existingSeoData.map(item => item.templateId));

    // Only process templates that don't have SEO data in template-seo.json
    const templatesNeedingTitles = templates.filter((t: any) => !existingIds.has(t.id));

    if (templatesNeedingTitles.length === 0) {
        console.log('All templates already have SEO data in template-seo.json, skipping title generation');
        return;
    }

    // Show templates that will be processed
    console.log(`\nFound ${templatesNeedingTitles.length} templates without SEO data:\n`);
    for (const tmpl of templatesNeedingTitles) {
        console.log(`  - ${tmpl.id} | ${tmpl.label}`);
    }

    // Ask for confirmation
    console.log(`\nThis will generate SEO titles for ${templatesNeedingTitles.length} templates.`);
    console.log('Press Ctrl+C to cancel, or Enter to continue...');

    // Wait for user input
    await new Promise<void>((resolve) => {
        process.stdin.once('data', () => {
            resolve();
        });
    });

    console.log('\nGenerating SEO titles...');

    let seoTitles: any[] = [];
    seoTitles = await generateTitles(templatesNeedingTitles);

    // Add newly generated SEO data to the existing data
    const newSeoEntries = templatesNeedingTitles.map((t: any) => {
        const generatedTitle = seoTitles.find((x: any) => x.alias === t.alias)?.title;
        const finalTitle = generatedTitle || t.label;

        return {
            templateId: t.id,
            seoTitle: finalTitle,
            seoSlug: slugify(finalTitle, { lower: true }),
        };
    });

    // Merge existing and new SEO data
    const allSeoData = [...existingSeoData, ...newSeoEntries];

    // Write updated template-seo.json
    fs.writeFileSync(seoDataPath, JSON.stringify(allSeoData, null, 2));
    console.log(`✓ Updated template-seo.json with ${newSeoEntries.length} new entries (total: ${allSeoData.length})`);
};

main();
