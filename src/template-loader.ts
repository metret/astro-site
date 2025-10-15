/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Loader, LoaderContext } from 'astro/loaders';
import { z } from 'astro:content';
import fs from "fs";
import path from "path";
import { marked } from "marked";

// Define any options that the loader needs
export function templatesLoader(): Loader {
    // Configure the loader
    return {
        name: "templates-loader",
        // Called when updating the collection.
        load: async (context: LoaderContext): Promise<void> => {
            // Load data and update the store
            const templates = JSON.parse(fs.readFileSync("data/templates.json", "utf8"));

            const templateSeo = JSON.parse(fs.readFileSync("data/template-seo.json", "utf8"));

            for (const t of templates) {
                // Look for a matching content file for this template
                let content = "";

                const contentPath = path.join("src/content/templates", `${t.alias}.md`);

                if (fs.existsSync(contentPath)) {
                    content = fs.readFileSync(contentPath, "utf8");
                }

                const seo = templateSeo.find((s: any) => s.templateId === t.id) ?? {};

                context.store.set({
                    id: t.id,
                    data: {
                        ...t,
                        ...seo,
                        createUrl: new URL(`/new/${t.id}`, import.meta.env.SITE).toString()
                    },
                    body: content,
                    rendered: {
                        html: await marked(content),
                    }
                });
            }
        },
        // Optionally, define the schema of an entry.
        // It will be overridden by user-defined schema.
        schema: async () => z.object({
            id: z.string().uuid(),
            accountId: z.string().uuid().nullable(),
            alias: z.string(),
            label: z.string(),
            description: z.string(),
            sort: z.number(),
            time: z.number().nullable(),
            people: z.number().nullable(),
            complexity: z.union([z.string(), z.number()]).nullable(),
            thumbUrl: z.string().url(),
            thumbEtag: z.string(),
            version: z.number(),
            metadata: z.record(z.any()).default({}),
            publishedAt: z.string().datetime(),
            createdAt: z.string().datetime(),
            createUrl: z.string().url(),
            seoTitle: z.string(),
            seoDescription: z.string(),
            seoSlug: z.string(),
            tags: z.array(
                z.object({
                    id: z.string().uuid(),
                    name: z.string(),
                    label: z.string(),
                    color: z.string(),
                    sort: z.number()
                })
            ),
        })
    };
}