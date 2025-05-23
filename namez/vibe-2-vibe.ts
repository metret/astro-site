import territories from './territories.json' assert { type: 'json' };
import fs from 'fs';
import path from 'path';

interface Territory {
    group: string;
    words: string[];
}

const territoriesTyped: Territory[] = territories;

import Anthropic from "@anthropic-ai/sdk";

// Define types for Anthropic API response chunks
interface ContentBlockDelta {
    type: 'content_block_delta';
    delta: {
        text: string;
    };
}

interface TextDelta {
    type: 'text_delta';
    delta: {
        value: string;
    };
}

type AnthropicResponseChunk = ContentBlockDelta | TextDelta;

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Function to call the Anthropic API
async function callAnthropicApi(language: string, variation: string) {

    const prompt = `
        You are an expert in ${language} & naming companies and brands.  
        You are tasked with naming a software product for collaboration within software teams.

        Here are some core requirements for the name:
        - Not more than 12 characters
        - Not more than 4 syllables
        - Must not include punctuation
        - Must not include non-standard English characters
        - Must not include a TLD at the end - this will be added later.
        - Must not end in 'ly' or 'ify'

        Here are some phrases that we want to base our name on:
        - In unison
        - At the same time
        - As one
        - In perfect rhythm
        - Like a well-oiled machine

        Please use your expert knowledge of ${language} and the above phrase to help select or invent product names.
        Please consider the whole phrase meanings, and not just the individual words.
        You can choose one, or combined a few, when inventing a name.

        Each run of this prompt will be given a unique "variation" to theme the name on.  For this run, please theme using ${variation}.
        
        For each, provide a single line explaining the name and thought behind it this format: 

        {name} - {thoughts}

        Generate 10 name suggestions.  
        Review each name to ensure it matches the core requirements mentioned at the top of the prompt.
        Just return the names, do not include any filler text or conversation.
        No empty lines.
        This data will be piped to a file for processing later.
    `;

    try {
        const response = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }],
            stream: true,
        });

        let fullText = "";

        for await (const chunk of response as AsyncIterable<AnthropicResponseChunk>) {
            let content = "";

            if (chunk.type === 'content_block_delta') {
                content = chunk.delta.text;
            }
            else if (chunk.type === 'text_delta') {
                content = chunk.delta.value;
            }

            fullText += content;
            process.stdout.write(content); // Stream to console
        }

        return fullText;

    } catch (error) {
        console.error("Error calling Anthropic API:", error);

        return '';
    }
}

// Function to compute and print pairs of territories and call the Anthropic API
async function processTerritoryPairs() {
    const all = [] as string[];

    const languages = [
        'Latin',
        'Old English',
        'Ancient Greek',
        'Sanskrit',
        'Hebrew',
        'Celtic/Gaelic',
    ]

    const variations = [
        'alliteration',
        'assonance',
        'consonance',
    ]

    for (const l of languages) {
        for (const v of variations) {
            all.push(await callAnthropicApi(l, v));
        }
    }

    // Filter out any empty strings
    const filteredResults = all.filter(result => result.trim() !== '');

    // Write the results to a file
    const resultsPath = 'vesults.txt';

    fs.writeFileSync(resultsPath, filteredResults.join('\n\n---\n\n'), 'utf8');

    console.log(`Results written to ${resultsPath}`);
    console.log(`Total results: ${all.length}, Non-empty results: ${filteredResults.length}`);
}

// Call the function to process the territory pairs and call the Anthropic API
processTerritoryPairs();