// 1. Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content';

// 2. Import loader(s)
import { glob, file, } from 'astro/loaders';
import { templatesLoader } from './template-loader';

// 3. Define your collection(s)
const blog = defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
    schema: z.object({
        title: z.string(),
        category: z.string(),
        teaser: z.any().optional(),
        description: z.string(),
        image: z.any().optional(),
        canonicalUrl: z.string(),
        section: z.string(),
        ogUrl: z.string(),
        ogSiteName: z.string(),
        ogType: z.string(),
        ogImageUrl: z.string(),
        ogImageWidth: z.number(),
        ogImageHeight: z.number(),
        ogImageAlt: z.string(),
        ogImageType: z.string(),
        publishedDate: z.date(),
        modifiedDate: z.date(),
        articleSection: z.string(),
        twitterCardType: z.string(),
        twitterTitle: z.string(),
        twitterDescription: z.string(),
        twitterImage: z.string(),
        authorName: z.string(),
    }),
});

const customers = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/customers" }),
    schema: z.object({
        // Standard
        title: z.string(),
        description: z.string(),
        image: z.string(),
        publishedDate: z.date(),
        modifiedDate: z.date(),
        // Extra
        color: z.string(),
        headerLead: z.string(),
        headerInfo: z.string(),
        headerImage: z.string(),
        quote: z.string(),
        contactName: z.string(),
        contactTitle: z.string(),
        contactImage: z.string(),
        companyName: z.string(),
        companyIndustry: z.string(),
        companyPeople: z.string(),
        sort: z.number(),
    }),
});

const templates = defineCollection({
    loader: templatesLoader(),
});

// 4. Export a single `collections` object to register your collection(s)
export const collections = { blog, customers, templates };
