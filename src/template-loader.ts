import type { Loader, LoaderContext } from 'astro/loaders';
import { z } from 'astro:content';

const bearer = "7d3383ed-0f0a-4604-9b9b-848e449820bb";

const load = async () => {
    console.log(bearer);
    const response = await fetch("https://metroretro.io/api/v2/templates.list2", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${bearer}`,
        },
    });
    return await response.json();
};

// Define any options that the loader needs
export function templatesLoader(): Loader {
    // Configure the loader
    return {
        name: "templates-loader",
        // Called when updating the collection.
        load: async (context: LoaderContext): Promise<void> => {
            // Load data and update the store
            const templates = await load();
            for (const t of templates) {
                context.store.set({
                    id: t.id,
                    data: t,
                })
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
            tags: z.array(
                z.object({
                    id: z.string().uuid(),
                    name: z.string(),
                    label: z.string(),
                    color: z.string(),
                    sort: z.number()
                })
            )
        })
    };
}