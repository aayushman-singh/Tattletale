import { Log } from "crawlee";
import path from "path";
import { Page } from "playwright";
import { uploadToS3, insertMessages } from "../mongoUtils";
import fs from "fs/promises";
import { extractVideos } from "./DownloadVideo";
import { extractImages } from "./DownloadImages";

export const openAllInstagramMessagesAndLog = async (
    page: Page,
    log: Log,
    username: string
) => {
    try {
        // Navigate to Instagram Direct Inbox
        log.info("Navigating to Instagram Direct Inbox.");
        await page.goto("https://www.instagram.com/direct/inbox/", {
            waitUntil: "networkidle",
        });

        // Handle "Not Now" notification pop-up
        try {
            const notNowButtonSelector = 'button:has-text("Not Now")'; // Adjust if necessary
            await page.waitForSelector(notNowButtonSelector, { timeout: 5000 });
            await page.click(notNowButtonSelector);
            log.info("Notification pop-up dismissed successfully.");
        } catch (error: any) {
            log.info(
                "Notification pop-up did not appear or was already dismissed."
            );
        }

        // Correct selector for user tiles using the role="listitem"
        const userTileSelector =
            'div[role="listitem"].x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x1iyjqo2';

        // Wait for user tiles to appear
        await page.waitForSelector(userTileSelector, { timeout: 60000 });

        // Extract all usernames from the chat list
        const chatUsernames = await page.evaluate(() => {
            const chatItems = document.querySelectorAll('div[role="listitem"]');
            return Array.from(chatItems)
                .map((item) => {
                    const usernameElement = item.querySelector(
                        "span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft"
                    );
                    return usernameElement
                        ? usernameElement.textContent!.trim()
                        : "null";
                })
                .filter(Boolean); // Remove any null or undefined usernames
        });

        log.info(
            `Found ${chatUsernames.length} chats: ${chatUsernames.join(", ")}`
        );

        // Process all chats (or limit to a subset if needed)
        const chatsToProcess = chatUsernames;

        for (const chatUsername of chatsToProcess) {
            log.info(`Opening chat with: ${chatUsername}`);
            let screenshotPaths: string[] = [];

            // Click the chat item using page.evaluate.
            const chatClicked = await page.evaluate((usernameToClick) => {
                const chatItems = document.querySelectorAll(
                    'div[role="listitem"]'
                );
                for (const item of chatItems) {
                    const usernameElement = item.querySelector(
                        "span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft"
                    );
                    if (
                        usernameElement &&
                        usernameElement.textContent!.trim() === usernameToClick
                    ) {
                        (item as HTMLElement).click();
                        return true;
                    }
                }
                return false;
            }, chatUsername);

            if (!chatClicked) {
                console.log(
                    `Could not find or click chat with ${chatUsername}. Skipping.`
                );
                continue;
            }

            await page.waitForSelector('div[role="row"]', { timeout: 30000 });
            log.info(`Chat with ${chatUsername} is now open`);

            // Scroll through the chat to load all messages
            let previousHeight = 0;
            let newHeight = await page.evaluate(
                () =>
                    document.querySelector('div[role="grid"]')?.scrollHeight ||
                    0
            );
            while (newHeight > previousHeight) {
                previousHeight = newHeight;
                await page.evaluate(async () => {
                    const chatBox = document.querySelector('div[role="grid"]');
                    chatBox?.scrollTo(0, chatBox.scrollHeight);
                });
                await page.waitForTimeout(500);
                newHeight = await page.evaluate(
                    () =>
                        document.querySelector('div[role="grid"]')
                            ?.scrollHeight || 0
                );
            }

            // Function to scroll through messages dynamically and log them,
            // and process media messages using the new extraction methods.
            const scrollChat = async () => {
                let previousMessageCount = 0;
                let messageCount = 0;
                let iteration = 1;
                let allRawMessages: any[] = [];

                while (true) {
                    // Get the current messages from the DOM.
                    let rawMessages: any[] = await page.evaluate(
                        (chatUsername) => {
                            const messageRows =
                                document.querySelectorAll('div[role="row"]');
                            return Array.from(messageRows)
                                .map((row) => {
                                    // Use the chat partner's username as default if sender not found.
                                    const sender = chatUsername;
                                    const textContentElement =
                                        row.querySelector('div[dir="auto"]');
                                    let type: string | null = null;
                                    let content: string | null = null;
                                    let url: string | null = null;

                                    if (textContentElement) {
                                        type = "text";
                                        content =
                                            textContentElement.textContent?.trim() ||
                                            "";
                                    }

                                    // Instead of directly reading media element URL, we set a flag.
                                    const mediaContentElement =
                                        row.querySelector("video, img");
                                    if (mediaContentElement) {
                                        if (
                                            mediaContentElement.tagName.toLowerCase() ===
                                            "video"
                                        ) {
                                            type = "video";
                                        } else if (
                                            mediaContentElement.tagName.toLowerCase() ===
                                            "img"
                                        ) {
                                            type = "image";
                                        }
                                        // The raw URL from the element is stored temporarily.
                                        url =
                                            mediaContentElement.getAttribute(
                                                "src"
                                            ) ||
                                            mediaContentElement
                                                .getAttribute("srcset")
                                                ?.split(" ")[0] ||
                                            null;
                                    }
                                    return type
                                        ? { sender, type, content, url }
                                        : null;
                                })
                                .filter((message) => message !== null);
                        },
                        chatUsername
                    );

                    messageCount = rawMessages.length;
                    console.log(
                        `Iteration ${iteration}: Found ${messageCount} messages.`
                    );

                    // Process any new messages that have media content.
                    // We loop over the new message rows (using the index within the page).
                    const startIndex = previousMessageCount;
                    const endIndex = Math.min(
                        messageCount,
                        previousMessageCount + 50
                    );

                    // Get all message rows from the page.
                    const messageRows = await page.$$('div[role="row"]');

async function retryGetElement<T>(
    fetchElement: () => Promise<T | null>,
    retries: number = 3,
    delayMs: number = 500
): Promise<T | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const element = await fetchElement();
        if (element) return element;
        console.warn(`Attempt ${attempt}: Element not found, retrying...`);
        await page.waitForTimeout(delayMs);
    }
    console.warn("Max retries reached: Element not found.");
    return null;
}

for (let i = startIndex; i < endIndex; i++) {
    // Re-fetch the message row before each action
    const messageElement = await retryGetElement(async () => {
        const messageRows = await page.$$('div[role="row"]');
        return messageRows[i] || null;
    });

    if (!messageElement) {
        console.warn(
            `Skipping message ${i + 1} as it is no longer in the DOM.`
        );
        continue;
    }

    // Scroll to the message safely
    try {
        await messageElement.scrollIntoViewIfNeeded();
    } catch (error) {
        console.warn(`Message ${i + 1} is not attached. Skipping.`);
        continue;
    }

    // Take a screenshot every 3 messages
    if ((i + 1) % 3 === 0 || i === endIndex - 1) {
        const screenshotPath = path.resolve(
            `./message_screenshot_${i + 1}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Screenshot taken for message ${i + 1}: ${screenshotPath}`);
        screenshotPaths.push(screenshotPath);
    }

    // Check for a media element inside the message row
    const mediaElement = await retryGetElement(() =>
        messageElement.$("video, img")
    );

    if (mediaElement) {
        try {
            // Click the media element to open the modal
            await mediaElement.click();
            await page.waitForSelector('svg[aria-label="Close"]', {
                timeout: 10000,
            });

            // Determine the media type from the modal
            const modalMediaType = await page.evaluate(() => {
                const modalMedia = document.querySelector(
                    'div[role="dialog"] video, div[role="dialog"] img'
                );
                return modalMedia ? modalMedia.tagName.toLowerCase() : null;
            });

            let mediaUrl = null;
            try {
                if (modalMediaType === "video") {
                    mediaUrl = await extractVideos(page);
                } else if (modalMediaType === "img") {
                    mediaUrl = await extractImages(page);
                } else {
                    console.warn("Could not determine media type from modal.");
                }
            } catch (extractionError) {
                console.error(
                    "Error during media extraction:",
                    extractionError
                );
            }

            // Click the modal close button
            try {
                await page.click('svg[aria-label="Close"]');
            } catch (closeError) {
                console.warn(
                    "Could not click the modal close button:",
                    closeError
                );
            }

            // Update the message with extracted media URL
            rawMessages[i].url = mediaUrl;
        } catch (error) {
            console.error(
                `Error processing media for message ${i + 1}:`,
                error
            );
        }
    }

    // Short delay before processing the next message
    await page.waitForTimeout(1000);
}


                    // Append or update our overall messages.
                    allRawMessages = rawMessages;

                    console.log(
                        `After iteration ${iteration}, total messages: ${messageCount}`
                    );
                    if (messageCount === previousMessageCount) {
                        console.log(
                            "No new messages loaded. Stopping scrolling."
                        );
                        break;
                    }
                    previousMessageCount = messageCount;
                    iteration++;

                    log.info(
                        `Number of messages found in ${chatUsername}'s chat: ${messageCount}`
                    );
                    await page.waitForTimeout(7000);
                }

                console.log("Scrolling completed.");
                return allRawMessages;
            };

            // Call the scroll function for this chat.
            const finalRawMessages = await scrollChat();

            // Save the messages to a JSON file.
            const jsonContent = JSON.stringify(
                { messages: finalRawMessages },
                null,
                2
            );
            const jsonFilePath = `./src/storage/${chatUsername}_instagram_messages.json`;
            await fs.mkdir(path.dirname(jsonFilePath), { recursive: true });
            await fs.writeFile(jsonFilePath, jsonContent, "utf8");
            log.info(
                `Messages for ${chatUsername} have been logged to ${jsonFilePath}`
            );

            // Optionally take a screenshot of the overall chat.
            const screenshotPath = path.resolve(
                `./${chatUsername}_instagram_screenshot.png`
            );
            log.info(
                `Screenshot of ${chatUsername}'s chat saved to ${screenshotPath}`
            );

            // Upload the JSON log to S3.
            const chatLogKey = `${username}/${chatUsername}/chat_log.json`;
            const chatLogURL = await uploadToS3(jsonFilePath, chatLogKey);
            console.log(`Chat log uploaded to S3: ${chatLogURL}`);

            await insertMessages(
                username,
                chatUsername,
                { rawMessages: finalRawMessages },
                chatLogURL,
                screenshotPaths,
                "instagram"
            );

            // Clear screenshots for next iteration.
            screenshotPaths = [];
            await page.waitForTimeout(2000);
        }
    } catch (error: any) {
        log.error(
            `Error while processing Instagram messages: ${error.message}`
        );
    }
};
