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
async function callAnthropicApi(variation: string, language: string) {

    const prompt = `
        You are an expert in ${language} & naming companies and brands.  
        You are tasked with naming a software product for collaboration within software teams.

        Here are some core requirements for the name:
        - Not more than 10 characters
        - Not more than 4 syllables
        - Must not include punctuation
        - Must end in ${variation}
        - Must not include a TLD at the end - this will be added later.

        Here are some phrases we think encapsulate the spirit of our product:
        1. In unison
        2. All at once
        3. At the same time
        4. As one
        5. In concert
        6. Hand in hand
        7. Shoulder to shoulder
        8. Side by side
        9. In harmony
        10. Collectively
        11. In lockstep
        12. Together as one
        13. Moving in tandem
        14. Synchronously
        15. In perfect rhythm
        16. Collaboratively
        17. Joint effort
        18. Joined forces
        19. United front
        20. All hands on deck
        21. Team effort
        22. Pulling together
        23. In solidarity
        24. Moving as a unit
        25. Seamless coordination
        26. Synchronized efforts
        27. Pooling resources
        28. Common purpose
        29. Working in concert
        30. Concerted effort
        31. Like a well-oiled machine
        32. In perfect coordination
        33. Aligned in action
        34. Orchestrated movement
        35. Unified approach
        36. Cohesive action

        Please use your expert knowledge of ${language} help select or invent brand names suggestions.       
        
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

    const variations = [
        'ify',
        'ly',
        'io',
        'er',
        'y',
        'able',
        'ist',
        'ity',
        'al',
        'ble',
        'sy',
        'ful',
        'ize',
        'ent',
        'us',
        'um',
        'ara',
        'ory',
    ];

    const languages = [
        'Latin',
        'Old English',
        'Ancient Greek',
        'Greek',
        'Sanskrit',
        'Hebrew',
        'Arabic',
        'Old Norse',
        'Japanese',
        'Celtic/Gaelic',
        'Italian',
        'French',
    ]

    for (const v of variations) {
        for (const l of languages) {
            all.push(await callAnthropicApi(v, l));
        }
    }

    // Filter out any empty strings
    const filteredResults = all.filter(result => result.trim() !== '');

    // Write the results to a file
    const resultsPath = 'results.txt';

    fs.writeFileSync(resultsPath, filteredResults.join('\n\n---\n\n'), 'utf8');

    console.log(`Results written to ${resultsPath}`);
    console.log(`Total results: ${all.length}, Non-empty results: ${filteredResults.length}`);
}

// Call the function to process the territory pairs and call the Anthropic API
processTerritoryPairs();