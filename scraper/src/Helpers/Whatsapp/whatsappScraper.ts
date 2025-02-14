import { Browser, chromium, Page } from "playwright";
import fs from "fs/promises";
import path from "path";
import { insertObject} from "../mongoUtils";
import { __dirname } from "../../../../config";
import dotenv from "dotenv";
import { extractMedia } from "./whatsappMedia";
import { scrollChatWithLogging } from "./whatsappChats";

dotenv.config();

const whatsappScraper = async (username: string, limit: number) => {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        // Launch a browser instance with Playwright
        const browser = await chromium.launchPersistentContext("./user-data", {
            headless: false,
        });
        page = await browser.newPage();

        await page.goto("https://web.whatsapp.com/", {
            waitUntil: "domcontentloaded",
        });

        // Wait for QR code scan only if cookies are not loaded
        if (!(await page.$('div[aria-label="Chat list"]'))) {
            console.log("Waiting for user to scan the QR code...");
            await page.waitForSelector(
                'canvas[aria-label="Scan this QR code to link a device!"]',
                { state: "detached" },
            );
            console.log("Logged in successfully!");
        } else {
            console.log("Session restored successfully!");
        }

        // Select the main chat container once logged in
        const chatContainerSelector = 'div[aria-label="Chat list"]';
        await page.waitForSelector(chatContainerSelector, {timeout: 60000 });

        await page.waitForTimeout(2500);
        // Iterate through each chat user tile
        const chatTiles = await page.$$(
            chatContainerSelector + ' div[role="listitem"]',
        );

        for (const [index, chatTile] of chatTiles.entries()) {
            let receiverUsername =
                (await chatTile.textContent()) || `chat_${index}`;
            receiverUsername = receiverUsername
                .split(":")[0]
                .replace(/[^a-zA-Z0-9_]/g, "");
            console.log(`Processing chat ${index + 1}: ${receiverUsername}`);
             const messageContainerSelector = 'div[role="application"]';
             const outputDir = path.join(
                 __dirname,
                 `screenshots_chat_${index + 1}`
             );
            // Click on each chat tile to open the chat
            await chatTile.click();
            await page.waitForTimeout(2000); // Wait for chat to load 
         
                    console.log(
                        `Starting Media scraping for ${receiverUsername}`
                    );
                    const mediaData = await extractMedia(username, page);
                    const dirPath = path.join(__dirname);

                    await fs.mkdir(dirPath, { recursive: true });

                    // Write mediaData to the media.json file
                    const filePath = path.join(
                        dirPath,
                        `${username}_media.json`
                    );
                    await fs.writeFile(filePath, mediaData);
            await insertObject(username, mediaData, 'files', 'whatsapp');
           
            await scrollChatWithLogging(
                username,
                receiverUsername,
                page,
                messageContainerSelector,
                outputDir,
                limit,
            );
        }
        console.log("All chats processed successfully!");
    } catch (error) {
        console.error("Error in whatsappScraper:", error);
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
};

export default whatsappScraper;
