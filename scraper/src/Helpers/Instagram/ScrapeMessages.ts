import { Log } from "crawlee";
import path from "path";
import { Page } from "playwright";
import { uploadToS3, insertMessages } from "../mongoUtils";
import fs from "fs/promises";
import { extractVideos } from "./DownloadVideo";
import { extractImages } from "./DownloadImages";


interface ChatItem {
    index: number;
    type: "text" | "post" | "date";
    content?: string;
    postUrl?: string;
    date?: Date;
}

export async function processChatPostsAndLog(page: Page): Promise<ChatItem[]> {
    const chatItems: ChatItem[] = [];
    const loggedContent = new Set<string>(); // To track logged content and prevent duplicates. Add date to set

    console.log("Starting to process chat posts...");

    // Wait for the chat container to load
    await page.waitForSelector(
        'div[role="button"][aria-label="Double tap to like"]',
        { timeout: 5000 }
    );

    // Get all divs in the chat
    const allDivs = await page.$$("div");
    console.log(`Found ${allDivs.length} div elements.`);

    for (let i = 0; i < allDivs.length; i++) {
        const div = allDivs[i];
        console.log(`\n=== Processing div ${i + 1} ===`);

        // Check if this div is a message (text or post)
        const isMessage = await div.evaluate((el) => {
            const hasText = el.querySelector('div[dir="auto"]');
            const isPost =
                el.getAttribute("aria-label") === "Double tap to like";
            return hasText || isPost;
        });

        if (isMessage) {
            const chatItem: ChatItem = { index: i, type: "text" };

            // Try to get text content
            const textContent = await div.evaluate((el) => {
                const textEl = el.querySelector('div[dir="auto"]');
                return textEl ? textEl.textContent?.trim() : null;
            });

            if (textContent) {
                chatItem.content = textContent;
                if (
                    textContent &&
                    textContent.trim() !== "" &&
                    !loggedContent.has(textContent)
                ) {
                    // Check for non-empty and duplicates
                    console.log(
                        `Div ${i + 1}: Found text content -> ${textContent}`
                    );

                    loggedContent.add(textContent);

                    chatItems.push(chatItem);
                    console.log(
                        `Div ${i + 1}: Added to chat items as type ${
                            chatItem.type
                        }.`
                    );
                } else {
                    console.log(
                        `Div ${
                            i + 1
                        }: Duplicate or empty text content, skipping.`
                    );
                }
            } else {
                // If textContent is empty but isMessage is true, it's probably an empty message
                console.log(`Div ${i + 1}: No text content found, skipping.`);
            }

            // Check if it's a post
            const isPost = await div.evaluate(
                (el) => el.getAttribute("aria-label") === "Double tap to like"
            );
            if (isPost) {
                chatItem.type = "post";
                console.log(`Div ${i + 1}: Identified as a post.`);

                // Check for media (image or video)
                const mediaElement = await div.$("img, video");
                if (mediaElement) {
                    console.log(`Div ${i + 1}: Media element found.`);

                    try {
                        // Scroll the post into view and click it
                        console.log(
                            `Div ${i + 1}: Scrolling post element into view...`
                        );
                        await div.scrollIntoViewIfNeeded();
                        console.log(
                            `Div ${i + 1}: Clicking the post element...`
                        );
                        await div.click({ force: true });

                        // Wait for the modal to load
                        console.log(`Div ${i + 1}: Waiting for modal URL...`);
                        await page.waitForURL(
                            (url: URL) =>
                                url.toString().includes("/p/") ||
                                url.toString().includes("/reel/"),
                            { timeout: 5000 }
                        );

                        // Extract the modal URL
                        const modalUrl = page.url();

                        if (modalUrl && !loggedContent.has(modalUrl)) {
                            chatItem.postUrl = modalUrl;
                            console.log(
                                `Div ${
                                    i + 1
                                }: Extracted post URL -> ${modalUrl}`
                            );
                            loggedContent.add(modalUrl);

                            chatItems.push(chatItem);
                            console.log(
                                `Div ${i + 1}: Added to chat items as type ${
                                    chatItem.type
                                }.`
                            );
                        } else {
                            console.log(
                                `Div ${i + 1}: Duplicate URL, skipping.`
                            );
                        }
                        await page.waitForSelector('svg[aria-label="Close"]', {
                            timeout: 2000,
                        }); // Adjust timeout as needed
                        await page.click('svg[aria-label="Close"]');

                    } catch (error) {
                        console.warn(
                            `Div ${i + 1}: Could not extract post URL:`,
                            error
                        );
                    }
                }
            }
        } else {
            // Check if this div is a timestamp
            const timestampText = await div.evaluate((el) => {
                const h4El = el.querySelector("h4.html-h4");
                if (h4El) {
                    const timeEl = h4El.querySelector(
                        'div[data-scope="date_break"] span span'
                    );
                    const fullTimeEl = h4El.querySelector("div.xzpqnlu");
                    return (timeEl || fullTimeEl)?.textContent?.trim() || null;
                }
                return null;
            });

            if (timestampText) {
                console.log(
                    `Div ${i + 1}: Found timestamp text -> ${timestampText}`
                );

                try {
                    let date: Date;

                    if (timestampText.includes("Today at")) {
                        const timeStr = timestampText.replace("Today at ", "");
                        const [time, period] = timeStr.split(" ");
                        const [hours, minutes] = time.split(":");
                        let hour = parseInt(hours);

                        if (period === "PM" && hour !== 12) hour += 12;
                        if (period === "AM" && hour === 12) hour = 0;

                        date = new Date();
                        date.setHours(hour, parseInt(minutes), 0, 0);
                    } else if (timestampText.includes("Yesterday at")) {
                        const timeStr = timestampText.replace(
                            "Yesterday at ",
                            ""
                        );
                        const [time, period] = timeStr.split(" ");
                        const [hours, minutes] = time.split(":");
                        let hour = parseInt(hours);

                        if (period === "PM" && hour !== 12) hour += 12;
                        if (period === "AM" && hour === 12) hour = 0;

                        date = new Date();
                        date.setDate(date.getDate() - 1);
                        date.setHours(hour, parseInt(minutes), 0, 0);
                    }
                   else if (timestampText.includes(",")) {
    // Handle the format "9/13/24, 2:17 PM"
    const [dateStr, timeStr] = timestampText.split(",");
    const [month, day, year] = dateStr
        .split("/")
        .map(Number);
    const [time, period] = timeStr.trim().split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let hour = hours;

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    // Correct year handling 
    const fullYear = year < 100 ? 2000 + year : (year < 1000 ? 2000 + year : year) ; // Ensure we have full year (e.g., 2024)

    try {
        // Create the date object
        date = new Date(fullYear, month - 1, day, hour, minutes);

        // Check if the date is valid  (Important!)
        if (isNaN(date.getTime())) {  // Use getTime() to check validity
            throw new Error("Invalid date created"); // Throw an error to be caught
        }

    } catch (dateError) {
        console.warn(`Div ${i + 1}:  Invalid date components after parsing: month=${month}, day=${day}, year=${fullYear}, hour=${hour}, minutes=${minutes}`);
        throw dateError; // Re-throw to provide more specifics or handle downstream

    }
}
 else {
                        // Handle standalone time format like "2:17 PM"
                        const [time, period] = timestampText.split(" ");
                        const [hours, minutes] = time.split(":").map(Number);
                        let hour = hours;

                        if (period === "PM" && hour !== 12) hour += 12;
                        if (period === "AM" && hour === 12) hour = 0;

                        date = new Date();
                        date.setHours(hour, minutes, 0, 0);
                    }

                    const dateString = date.toISOString();
                    if (!loggedContent.has(dateString)) {
                        chatItems.push({ index: i, type: "date", date });
                        console.log(
                            `Div ${
                                i + 1
                            }: Added to chat items as type date -> ${date.toISOString()}`
                        );

                        loggedContent.add(dateString);
                    } else {
                        console.log(`Div ${i + 1}: Duplicate date, skipping.`);
                    }
                } catch (error) {
                    console.warn(
                        `Div ${
                            i + 1
                        }: Could not parse timestamp -> ${timestampText}`,
                        error
                    );
                }
            } else {
                console.log(
                    `Div ${i + 1}: Not a message or timestamp, skipping.`
                );
            }
        }
    }

    console.log("Finished processing chat posts.");
    return chatItems;
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
            await page.waitForSelector(notNowButtonSelector, { timeout: 3000 });
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

            await scrollChat(); // We still call this to load all messages, but don't use the return value

            // Process the chat messages
            const processedMessages = await processChatPostsAndLog(page);

            // Create chat data object with only processed messages

            // Save to JSON file
            const jsonContent = JSON.stringify(processedMessages, null, 2);
            const jsonFilePath = `./src/storage/${chatUsername}_instagram_messages.json`;
            await fs.mkdir(path.dirname(jsonFilePath), { recursive: true });
            await fs.writeFile(jsonFilePath, jsonContent, "utf8");
            console.log(
                `Messages for ${chatUsername} have been logged to ${jsonFilePath}`
            );

            // Upload to S3 and MongoDB with only processed messages
            const chatLogKey = `${username}/${chatUsername}/chat_log.json`;
            const chatLogURL = await uploadToS3(jsonFilePath, chatLogKey);
            console.log(`Chat log uploaded to S3: ${chatLogURL}`);

            // Insert only processed messages to MongoDB
            await insertMessages(
                username,
                chatUsername,
                processedMessages, // This now only contains processed messages
                chatLogURL,
                screenshotPaths,
                "instagram"
            );

            // Take overall screenshot if needed
            const overallScreenshotPath = path.resolve(
                `./${chatUsername}_instagram_screenshot.png`
            );
            console.log(
                `Screenshot of ${chatUsername}'s chat saved to ${overallScreenshotPath}`
            );

            // Clear screenshots for next iteration
            screenshotPaths = [];
            await page.waitForTimeout(2000);
        }
    } catch (error: any) {
        console.log(
            `Error while processing Instagram messages: ${error.message}`
        );
    }
};