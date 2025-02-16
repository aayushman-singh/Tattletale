import path from "path";
import { Page } from "playwright";
import fs from "fs/promises";
import { uploadToS3, insertMessages } from "../mongoUtils";

interface ChatMessage {
    type: string;
    message: string;
    timestamp: string | null;
}

const convertDateToISO = (dateText: string): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    switch (dateText.toUpperCase()) {
        case "TODAY":
            return today.toISOString();
        case "YESTERDAY":
            return yesterday.toISOString();
        default:
            // Handle weekday names or specific dates
            const parsedDate = new Date(dateText);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString();
            }
            // If we can't parse it, return current date as fallback
            return dateText;
    }
};

export const scrollChatWithLogging = async (
    username: string,
    receiverUsername: string,
    page: Page,
    messageContainerSelector: string,
    outputDir: string,
    limit: number,
    mediaData: object
) => {
    const screenshotPaths: string[] = [];
    const jsonFilePath = path.join(outputDir, `chat_text.json`);
    const chatData: ChatMessage[] = [];

    try {
        console.log("Starting infinite scrolling upward...");
        let totalMessageCount = 0;
        let attempt = 0;

        while (totalMessageCount < limit) {
            while (attempt < 10) {
                const messageRows = await page.$$(
                    messageContainerSelector +
                        " div.message-in, div.message-out"
                );
                const newMessageCount = messageRows.length;

                if (newMessageCount > totalMessageCount) {
                    const messagesToLoad = Math.min(
                        newMessageCount - totalMessageCount,
                        limit - totalMessageCount
                    );

                    console.log(
                        `Loaded ${messagesToLoad} new messages (Total: ${
                            totalMessageCount + messagesToLoad
                        }/${limit}).`
                    );

                    totalMessageCount += messagesToLoad;
                    attempt = 0; // Reset attempts if new messages are found

                    // Scroll to the first visible row
                    await messageRows[0].scrollIntoViewIfNeeded();
                    await page.waitForTimeout(1500);
                } else {
                    attempt++;
                    console.log(
                        `No new messages found. Waiting... (Attempt ${attempt}/10)`
                    );
                    await page.waitForTimeout(2000);
                }

                if (totalMessageCount >= limit) {
                    console.log(
                        `Reached the limit of ${limit} messages. Stopping scroll.`
                    );
                    break;
                }
            }

            if (attempt >= 10) {
                console.log(
                    "No more messages to load after 10 attempts. Stopping."
                );
                break;
            }
        }

        console.log(
            "Finished scrolling upward. Now capturing messages and screenshots..."
        );

        await fs.mkdir(path.dirname(jsonFilePath), { recursive: true });
 
        const allElements = await page.$$(
            `${messageContainerSelector} div.message-in, ` +
                `${messageContainerSelector} div.message-out, ` +
                `${messageContainerSelector} div[class*="focusable-list-item"]:not([class*="message"])`
        );

        let messageCount = 0;

        for (let idx = 0; idx < allElements.length; idx++) {
            const element = allElements[idx];

            // Check if element is a date separator
            const isDate = await element.evaluate((node) =>
                node.matches(
                    'div[class*="focusable-list-item"]:not([class*="message"])'
                )
            );

            if (isDate) {
                // Handle date element
                const dateSpan = await element.$("span");
                if (dateSpan) {
                    const dateText = await dateSpan.innerText();
                    const isoDate = convertDateToISO(dateText);
                    chatData.push({
                        type: "date",
                        message: isoDate,
                        timestamp: null,
                    });
                    console.log(`Date element added: ${isoDate}`);
                }
            } else {
                // Handle regular message
                const messageText = await element.innerText();
                const lines = messageText.split("\n");
                const timestamp = lines.pop()?.trim() || "Unknown";
                const content = lines.join("\n").trim();

                const isIncoming = await element.evaluate((node) =>
                    node.classList.contains("message-in")
                );
                const messageType = isIncoming ? "Incoming" : "Outgoing";

                chatData.push({
                    type: messageType,
                    message: content,
                    timestamp: timestamp,
                });

                messageCount++;
                console.log(
                    `${messageType} Message ${messageCount} with timestamp ${timestamp} added.`
                );

                // Capture screenshot every 3 messages
                if ((messageCount - 1) % 3 === 0) {
                    await element.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(500);
                    const screenshotPath = path.join(
                        outputDir,
                        `${username}_${receiverUsername}_screenshot_${messageCount}.png`
                    );
                    await page.screenshot({ path: screenshotPath });
                    console.log(
                        `Screenshot saved for message ${messageCount}.`
                    );
                    screenshotPaths.push(screenshotPath);
                }
            }
        }

        await fs.writeFile(jsonFilePath, JSON.stringify(chatData, null, 2));
        console.log(`Chat data written to JSON file: ${jsonFilePath}`);

        const chatLogKey = `${username}/${receiverUsername}_chat_log.json`;
        const chatLogURL = await uploadToS3(jsonFilePath, chatLogKey);
        console.log(`Chat log uploaded to S3: ${chatLogURL}`);


        await insertMessages(
            username,
            receiverUsername,
            chatData,
            chatLogURL,
            screenshotPaths,
            "whatsapp",
            mediaData
        );
        console.log("Finished capturing messages and screenshots.");
    } catch (error: any) {
        console.error(
            "Error during scrolling and screenshot capture:",
            error.message
        );
    }
};
