/* eslint-disable no-console */

import fs from "fs";
import path from "path";

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

const loadSnapshot = async (templateId: string) => {
    const response = await fetch(`https://ludi.co/api/v2/templates.snapshot?boardId=${templateId}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${bearer}`,
        },
    });

    return await response.json();
};

const downloadImage = async (url: string, outputFolder: string) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        const urlPath = new URL(url).pathname;
        const filename = path.basename(urlPath) || `image-${Date.now()}.svg`;
        const filepath = path.join(outputFolder, filename);
        
        fs.writeFileSync(filepath, Buffer.from(buffer));
        console.log(`Downloaded: ${filename}`);
        return filename;
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
        return null;
    }
};

const main = async () => {
    console.log("Fetching templates list...");
    const templates = await load();

    console.log(`Found ${templates.length} templates`);

    const allUrls = new Set<string>();
    const outputFolder = path.resolve("template-images");

    // Create output folder if it doesn't exist
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
        console.log(`Created folder: ${outputFolder}`);
    }

    let downloadCount = 0;

    for (const template of templates) {
        console.log(`\nProcessing template: ${template.alias || template.label || template.id}`);

        try {
            const snapshot = await loadSnapshot(template.id);
            const snapshotText = JSON.stringify(snapshot);
            
            // Extract all URLs using regex
            const urlRegex = /"url"\s*:\s*"([^"]+)"/g;
            let match;
            
            while ((match = urlRegex.exec(snapshotText)) !== null) {
                const url = match[1];
                if (!allUrls.has(url)) {
                    allUrls.add(url);
                    console.log(`Found new URL: ${url}`);
                    console.log(`Downloading immediately...`);
                    
                    const result = await downloadImage(url, outputFolder);
                    if (result) {
                        downloadCount++;
                    }
                    
                    // Small delay between downloads
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    console.log(`Already found URL: ${url} (skipping)`);
                }
            }
        } catch (error) {
            console.error(`Error fetching snapshot for ${template.id}:`, error);
        }

        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\nDownload complete! Downloaded ${downloadCount} unique images to ${outputFolder}`);
    console.log(`Total unique URLs found: ${allUrls.size}`);
};

main().catch(console.error);