/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
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

const loadSnapshot = async (templateId: string) => {
    const response = await fetch(`https://metroretro.io/api/v2/templates.snapshot?boardId=${templateId}`, {
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

const generateArticle = async (tmpl: Record<string, any>) => {

    console.log(`Generating article for ${tmpl.alias}`);

    const snapshot = await loadSnapshot(tmpl.id);

    const structure = `
# Recommended Structure for Metro Retro Template Descriptions

1. Title & SEO-Optimized Introduction

- Use a clear H1 heading with the template name
- Include an opening paragraph that defines the template using relevant keywords
- Front-load key terms and phrases that users might search for

2. What Is [Template Name]?

- Provide a concise but thorough explanation of the template
- Describe its purpose and origin (if relevant)
- Include the key concepts or metaphor the template is based on

3. Benefits & When to Use

-Explain what problems this template helps solve
-Identify when in a project/process this template is most valuable
-Highlight specific benefits teams will gain from using it

4. How to Run a [Template Name] Session

- Provide clear, numbered steps for facilitating the activity
- Include estimated time frames for each step and the total session
- Describe the different components/sections of the template
- Prefer fewer large steps, more smaller steps

5. Tips for a Successful Session

- Offer practical advice based on experience
- Address common challenges facilitators might face
- Include suggestions for remote/hybrid teams if applicable
`;

    const tone = `
# Tone Guidelines for Writing Metro Retro Template Descriptions

Write in a clear, helpful, and practical tone that balances professionalism with approachability. You're writing for busy professionals who need to quickly understand and implement meeting techniques.

## Voice characteristics
- Confident but not authoritative
- Practical and solution-oriented
- Conversational but not casual
- Concise without being terse
- Enthusiastic without being overly excited

## Do
- Use direct, active language that guides the reader clearly
- Include specific, actionable advice based on real-world experience
- Vary sentence structure to maintain reader engagement
- Use occasional rhetorical questions to engage the reader
- Write as if you're an experienced facilitator sharing knowledge with a colleague

## Avoid
- Unnecessary jargon or academic language
- Overly formal or stiff phrasing
- Repetitive sentence structures (especially "This template is..." or "You can use this to...")
- Vague generalizations without specific examples
- Hedging language ("perhaps," "maybe," "might consider")
- Excessively enthusiastic language or multiple exclamation points

## Stylistic elements
- Use bullet points for lists rather than long paragraphs
- Include time estimates where relevant
- Keep paragraphs short (2-4 sentences maximum)
- Occasionally address the reader directly using "you"
- Use metaphors sparingly but effectively to explain complex concepts

Your writing should sound like it comes from a knowledgeable colleague who respects the reader's time and intelligence, while providing genuinely useful guidance. The tone should convey that you've personally facilitated these activities multiple times and are sharing proven approaches.
`;

    const filePath = `./data/raw-template-info/${tmpl.alias}.md`;

    const existingCopy = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : 'None';

    const msg = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1024 * 2,
        system: [
            'You are a helpful copy writer, knowledgable in SEO and agile methodologies.',
            'You are helping write instructions and descriptions for collaborative meeting templates in the application Metro Retro, a collaborative whiteboard tool for dev teams.',
            'The user will provide the template metadata, a snapshot of the raw data that makes up the template (e.g. the visual elements in data form), and some existing copy.',
            'Using all the information provided, along with your own insight where applicable, please write a new description for the template.',
            'Here is a recommended structure to follow:',
            structure,
            'Here is a tone to write in:',
            tone,
            'Here are some other points to consider:',
            ' - All these templates are aimed at remote teams, dev teams or product teams.  Do not be fooled by the metaphors used into thinking otherwise.',
            ' - You are writing a description for a template in a collaborative whiteboard tool (Metro Retro) - so when writing assume meetings will be performed online via this tool.',
            ' - If the template is using a metaphor, list out and explain the metaphor components.',
            ' - When writing retrospective instructions, teams will almost always follow a structure of Introduction, Reflection, Discussion/Grouping/Voting, and Review + Actions setting.',
        ].join('\n'),
        messages: [
            { role: "user", content: `Metadata: ${JSON.stringify(tmpl)}\n\nSnapshot: ${JSON.stringify(snapshot)}\n\nExisting copy: ${existingCopy}` }
        ],
    });

    if (msg.content[0].type === 'text') {
        return msg.content[0].text;
    } else {
        console.error('Unexpected message content type:', msg.content[0]);
    }
};

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
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 1024 * 4,
            system: [
                'You are a helpful SEO expert.',
                'You are helping generate SEO metadata for the application Metro Retro, a collaborative whiteboard tool for dev teams.',
                'You are given a list of templates and their tags.',
                'You are to generate a page title for each template\'s respective website page.',
                'The title should be 60 characters or less.',
                'The title should be SEO friendly.',
                'Prefer "Retrospective" over "Retro".',
                '| Metro Retro will be appended by the application, so do not include it in the title.',
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
    const templates = await load();

    slugifyAliases(templates);
    kebabizeTags(templates);

    const seoTitles = await generateTitles(templates);

    // Match up the titles with the templates
    const matched = templates.map((t: any) => ({
        ...t,
        seoTitle: seoTitles.find((x: any) => x.alias === t.alias)?.title,
        seoSlug: slugify(seoTitles.find((x: any) => x.alias === t.alias)?.title || t.alias, { lower: true }),
    }));

    // Write to file
    fs.writeFileSync("./data/templates.json", JSON.stringify(matched, null, 2));

    for (const tmpl of templates) {
        console.log(`Processing articles for ${tmpl.alias}`);

        const contentPath = `./src/content/templates/${tmpl.alias}.md`;

        if (fs.existsSync(contentPath) && !process.argv.includes('--force')) {
            console.log(`Skipping ${tmpl.alias} because it already exists`);
        }
        else {
            const content = await generateArticle(tmpl);

            if (content) {
                fs.writeFileSync(contentPath, content);
            }

            // Wait for 30 seconds, b/c of rate limits on the API
            await new Promise(resolve => setTimeout(resolve, 30000));
        }


    }

};

main();