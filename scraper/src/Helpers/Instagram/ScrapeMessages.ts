import { Log } from "crawlee";
import path from "path";
import { Page } from "playwright";
import { uploadToS3, insertMessages } from "../mongoUtils";
import fs from "fs/promises";
import { extractVideos } from "./DownloadVideo";
import { extractImages } from "./DownloadImages";


interface ChatMessage {
    index: number;
    type: "text" | "post";
    content?: string;
    postUrl?: string;
    timestamp?: string;
}

export async function processChatPostsAndLog(
    page: Page
): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    // Get all chat message rows
    const messageRows = await page.$$('div[role="row"]');
    console.log(`Found ${messageRows.length} message rows.`);

    for (let i = 0; i < messageRows.length; i++) {
        console.log(`\n=== Processing message row ${i + 1} ===`);

        // Create base message object
        const message: ChatMessage = {
            index: i,
            type: "text",
        };

        // Try to get text content first
        const textContent = await messageRows[i].evaluate((row) => {
            const textEl = row.querySelector('div[dir="auto"]');
            return textEl ? textEl.textContent?.trim() : null;
        });

        if (textContent) {
            message.content = textContent;
        }

        // Look for post element
        const postElement = await messageRows[i].$(
            'div[role="button"][aria-label="Double tap to like"]'
        );

        if (postElement) {
            message.type = "post";
            const postText = await postElement.textContent();
            message.content = postText;
            console.log(`Row ${i + 1}: Post text content -> ${postText}`);

            // Check for media
            const mediaElement = await postElement.$("img, video");
            if (mediaElement) {
                try {
                    await postElement.scrollIntoViewIfNeeded();
                    await postElement.click({ force: true });
                    console.log(`Row ${i + 1}: Clicked the post element.`);

                    // Wait for modal URL
                    await page.waitForURL(
                        (url: URL) =>
                            url.toString().includes("/p/") ||
                            url.toString().includes("/reel/"),
                        { timeout: 5000 }
                    );

                    const modalUrl = page.url();
                    message.postUrl = modalUrl;
                    console.log(
                        `Row ${i + 1}: Extracted modal URL -> ${modalUrl}`
                    );

                    // Close modal
                    await page.getByRole("button", { name: "Close" }).click();
                    console.log(`Row ${i + 1}: Closed the modal.`);
                } catch (error) {
                    console.error(
                        `Row ${i + 1}: Error processing post:`,
                        error
                    );
                }
            }
        }

        // Add timestamp if available (you might need to adjust the selector)
        try {
            const timestamp = await messageRows[i].evaluate((row) => {
                const timeEl = row.querySelector("time");
                return timeEl ? timeEl.getAttribute("datetime") : null;
            });
            if (timestamp) {
                message.timestamp = timestamp;
            }
        } catch (error) {
            console.warn(`Row ${i + 1}: Could not extract timestamp`);
        }

        messages.push(message);
        await page.waitForTimeout(2000);
    }

    return messages;
}


export const openAllInstagramMessagesAndLog = async (
    page: Page,
   
    username: string
) => {
    try {
        // Navigate to Instagram Direct Inbox
        console.log("Navigating to Instagram Direct Inbox.");
        await page.goto("https://www.instagram.com/direct/inbox/", {
            waitUntil: "networkidle",
        });

        // Handle "Not Now" notification pop-up
        try {
            const notNowButtonSelector = 'button:has-text("Not Now")'; // Adjust if necessary
            await page.waitForSelector(notNowButtonSelector, { timeout: 5000 });
            await page.click(notNowButtonSelector);
            console.log("Notification pop-up dismissed successfully.");
        } catch (error: any) {
            console.log(
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

        console.log(
            `Found ${chatUsernames.length} chats: ${chatUsernames.join(", ")}`
        );

        // Process all chats (or limit to a subset if needed)
        const chatsToProcess = chatUsernames;

        for (const chatUsername of chatsToProcess) {
            console.log(`\n=== Opening chat with: ${chatUsername} ===`);
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
            console.log(`Chat with ${chatUsername} is now open`);

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

            // Function to scroll through messages dynamically and log them.
            // (This remains largely unchanged from your original code.)
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
                                    const sender = chatUsername;
                                    const textContentElement =
                                        row.querySelector('div[dir="auto"]');
                                    let type: string | null = null;
                                    let content: string | null = null;

                                    if (textContentElement) {
                                        type = "text";
                                        content =
                                            textContentElement.textContent?.trim() ||
                                            "";
                                    }

                                    // Check for any button in the row (as a flag for media posts)
                                    const rowButton =
                                        row.querySelector("button");

                                    return type
                                        ? {
                                              sender,
                                              type,
                                              content,
                                              buttonExists: !!rowButton,
                                          }
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

                    // (Your existing code to process individual messages and take screenshots remains here)
                    // For brevity, we leave the per-message screenshot and scrolling logic intact.
                    // Only the media-processing part is being handled later via our new function.

                    // Process only the new messages in this iteration.
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
                            console.warn(
                                `Attempt ${attempt}: Element not found, retrying...`
                            );
                            await page.waitForTimeout(delayMs);
                        }
                        console.warn("Max retries reached: Element not found.");
                        return null;
                    }

                    for (let i = startIndex; i < endIndex; i++) {
                        // Re-fetch the message row before each action.
                        const messageElement = await retryGetElement(
                            async () => {
                                const messageRows = await page.$$(
                                    'div[role="row"]'
                                );
                                return messageRows[i] || null;
                            }
                        );
                        if (!messageElement) {
                            console.warn(
                                `Skipping message ${
                                    i + 1
                                } as it is no longer in the DOM.`
                            );
                            continue;
                        }

                        // Scroll the message into view.
                        try {
                            await messageElement.scrollIntoViewIfNeeded();
                        } catch (error) {
                            console.warn(
                                `Message ${i + 1} is not attached. Skipping.`
                            );
                            continue;
                        }

                        // (Optional) Take a screenshot every 3 messages.
                        if ((i + 1) % 3 === 0 || i === endIndex - 1) {
                            const screenshotPath = path.resolve(
                                `./message_screenshot_${i + 1}.png`
                            );
                            await page.screenshot({
                                path: screenshotPath,
                                fullPage: false,
                            });
                            console.log(
                                `Screenshot taken for message ${
                                    i + 1
                                }: ${screenshotPath}`
                            );
                            screenshotPaths.push(screenshotPath);
                        }

                        // (We are not processing media here in the per-message loop anymore.)
                        await page.waitForTimeout(1000);
                    }

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

                    console.log(
                        `Number of messages found in ${chatUsername}'s chat: ${messageCount}`
                    );
                    await page.waitForTimeout(7000);
                }

                console.log("Scrolling completed.");
                return allRawMessages;
            };

            // Call the scroll function for this chat.
            const finalRawMessages = await scrollChat();


            // Call the new media processing function for this chat.
            const processedMessages= await processChatPostsAndLog(page);

            const chatData = {
                messages: processedMessages,
                rawMessages: finalRawMessages,
            };

            const jsonContent = JSON.stringify(chatData, null, 2);
            const jsonFilePath = `./src/storage/${chatUsername}_instagram_messages.json`;
            await fs.mkdir(path.dirname(jsonFilePath), { recursive: true });
            await fs.writeFile(jsonFilePath, jsonContent, "utf8");
            console.log(
                `Messages for ${chatUsername} have been logged to ${jsonFilePath}`
            );

            // Upload to S3 and MongoDB (your existing code)
            const chatLogKey = `${username}/${chatUsername}/chat_log.json`;
            const chatLogURL = await uploadToS3(jsonFilePath, chatLogKey);
            console.log(`Chat log uploaded to S3: ${chatLogURL}`);

            await insertMessages(
                username,
                chatUsername,
                chatData,
                chatLogURL,
                screenshotPaths,
                "instagram"
            );
            console.log(
                `Messages for ${chatUsername} have been logged to ${jsonFilePath}`
            );

            // Optionally take a screenshot of the overall chat.
            const overallScreenshotPath = path.resolve(
                `./${chatUsername}_instagram_screenshot.png`
            );
            console.log(
                `Screenshot of ${chatUsername}'s chat saved to ${overallScreenshotPath}`
            );

          
            console.log(`Chat log uploaded to S3: ${chatLogURL}`);

            await insertMessages(
                username,
                chatUsername,
                { messages: chatData },
                chatLogURL,
                screenshotPaths,
                "instagram"
            );

            // Clear screenshots for next iteration.
            screenshotPaths = [];
            await page.waitForTimeout(2000);
        }
    } catch (error: any) {
        console.log(
            `Error while processing Instagram messages: ${error.message}`
        );
    }
};