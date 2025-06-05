import { Browser, chromium, Page } from "playwright";
import fs from "fs/promises";
import path from "path";
import { insertObject } from "../mongoUtils";
import { __dirname } from "../../../../config";
import dotenv from "dotenv";
import { extractMedia } from "./whatsappMedia";
import { scrapeWhatsappChats } from "./whatsappChats";

dotenv.config();

const whatsappScraper = async (username: string, limit: number) => {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        const browser = await chromium.launchPersistentContext("./user-data", {
            headless: true,
        });
        page = await browser.newPage();

        await page.goto("https://web.whatsapp.com/", {
            waitUntil: "domcontentloaded",
        });

        if (!(await page.$('div[aria-label="Chat list"]'))) {
            console.log("Waiting for user to scan the QR code...");
            await page.waitForSelector(
                'canvas[aria-label="Scan this QR code to link a device!"]',
                { state: "detached" }
            );
            console.log("Logged in successfully!");
        } else {
            console.log("Session restored successfully!");
        }

        const chatContainerSelector = 'div[aria-label="Chat list"]';
        await page.waitForSelector(chatContainerSelector, { timeout: 60000 });

        await page.waitForTimeout(2500);

        const chatTiles = await page.$$(
            chatContainerSelector + ' div[role="listitem"]'
        );

        let successfulChats = 0;
        let failedChats = 0;

        for (const [index, chatTile] of chatTiles.entries()) {
            try {
                let receiverUsername =
                    (await chatTile.textContent()) || `chat_${index}`;
                receiverUsername = receiverUsername
                    .split(":")[0]
                    .replace(/[^a-zA-Z0-9_]/g, "");
                console.log(
                    `Processing chat ${index + 1}: ${receiverUsername}`
                );

                const messageContainerSelector = 'div[role="application"]';
                const outputDir = path.join(
                    __dirname,
                    `screenshots_chat_${index + 1}`
                );

                await chatTile.click();
                await page.waitForTimeout(2000);

                console.log(`Starting Media scraping for ${receiverUsername}`);
                let filesData = {};
                try {
                     filesData = await extractMedia(username, page);
                } catch (error) {
                    console.log("Could not extract media");
                }
                console.log("After extraction: " + filesData);

                await scrapeWhatsappChats(
                    username,
                    receiverUsername,
                    page,
                    messageContainerSelector,
                    outputDir,
                    limit,
                    filesData
                );

                successfulChats++;
                console.log(
                    `✅ Successfully processed chat: ${receiverUsername}`
                );
            } catch (chatError) {
                failedChats++;
                console.error(
                    `❌ Error processing chat ${index + 1}:`,
                    chatError
                );
                console.log(`Continuing to next chat...`);

                // Optional: Try to navigate back to chat list if we're stuck in a chat
                try {
                    await page.goBack();
                    await page.waitForTimeout(1000);
                } catch (navigationError) {
                    console.warn(
                        "Could not navigate back to chat list:",
                        navigationError
                    );
                }
            }
        }

        console.log(`\n📊 Processing Summary:`);
        console.log(`✅ Successful chats: ${successfulChats}`);
        console.log(`❌ Failed chats: ${failedChats}`);
        console.log(`📱 Total chats processed: ${chatTiles.length}`);
    } catch (error) {
        console.error("Error in whatsappScraper:", error);
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
};

export default whatsappScraper;
