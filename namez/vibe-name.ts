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
async function callAnthropicApi(territory1: Territory, territory2: Territory) {

    const prompt = `
        You are an expert in naming companies and brands.  
        You are tasked with naming a software product for collaboration within software teams.

        Here are some core requirements for the name:
        - Not more than 10 characters
        - Not more than 4 syllables
        - Must not end in .com, .io, .co or another TLD - this will be added later.
        - Must not sound pharmaceutical
        - Must not sound like a crypto or meme coin.
        - Must not include punctuation
        - Must not be a single common English word, .e.g "Scout".

        Below are two sets of "word territories"; words that are grouped by meaning, theme or vibe.  
        These are all based on tenets of the software product you are tasked with naming.
        In addition, there is tonal map provided that describes the "tone" of the desired name.  
        
        For the territories and tonal map, use them to help guide name generation for the software product.
        We are interested in names with connections to these words, or these words in alt or old languages, e.g. Latin, Greek, Arabic, Sansrkit or Old English.
        For each, provide a single line explaining the etymology this format: 

        {word} - {etymology}

        ### ${territory1.group}: 
        ${territory1.words.map(x => '- ' + x).join("\n")}

        ### ${territory2.group}: 
        ${territory2.words.map(x => '- ' + x).join("\n")}

        ### Tonal Map
        - modern
        - playful
        - outgoing
        - intuitive
        - inspiring
        - expressive
        - energetic
        - bold
        - human
        - casual
        - dynamic
        - opinionated

        Generate 50 name suggestions.  
        Review each name to ensure it matches the core requirements mentioned at the top of the prompt.
        Just return the 100 names, do not include any filler text or conversation.
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
    }
}

// Function to compute and print pairs of territories and call the Anthropic API
async function processTerritoryPairs() {
    const all = [] as string[];

    for (let i = 0; i < territoriesTyped.length; i++) {
        for (let j = i + 1; j < territoriesTyped.length; j++) {
            console.log(`Pair: ${territoriesTyped[i].group} and ${territoriesTyped[j].group}`);
            all.push(await callAnthropicApi(territoriesTyped[i], territoriesTyped[j]) || '');
        }
    }

    // Filter out any empty strings
    const filteredResults = all.filter(result => result.trim() !== '');

    // Write the results to a file
    const resultsPath = path.join('./namez', 'results.txt');

    fs.writeFileSync(resultsPath, filteredResults.join('\n\n---\n\n'), 'utf8');

    console.log(`Results written to ${resultsPath}`);
    console.log(`Total results: ${all.length}, Non-empty results: ${filteredResults.length}`);
}

// Call the function to process the territory pairs and call the Anthropic API
processTerritoryPairs();