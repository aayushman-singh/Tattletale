import { Log } from "crawlee";
import path from "path";
import { Page } from "playwright";
import { uploadChats, uploadToS3, insertMessages } from "../mongoUtils";
import fs from "fs/promises";
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

            // Function to scroll through messages dynamically and log them
            const scrollChat = async () => {
                let previousMessageCount = 0;
                let messageCount = 0;
                let iteration = 1;

                while (true) {
                    // Evaluate the messages on the page.
                    // Pass chatUsername so that if no sender is found the chat partner’s name is used.
                    const messages = await page.evaluate((chatUsername) => {
                        const messageRows =
                            document.querySelectorAll('div[role="row"]');
                        return Array.from(messageRows)
                            .map((row) => {
                                const senderElement = row.querySelector(
                                    "h5 span.xzpqnlu, h4 span.xzpqnlu"
                                );
                                const textContentElement =
                                    row.querySelector('div[dir="auto"]');
                                const mediaContentElement =
                                    row.querySelector("video, img");

                                // Use the chat partner's username as default if sender not found.
                                const sender = senderElement
                                    ? senderElement.textContent!.trim()
                                    : chatUsername;

                                let type: string | null = null;
                                let content: string | null = null;
                                let url: string | null = null;

                                if (textContentElement) {
                                    type = "text";
                                    content =
                                        textContentElement.textContent?.trim() ||
                                        "";
                                }

                                if (mediaContentElement) {
                                    if (
                                        mediaContentElement.tagName.toLowerCase() ===
                                        "video"
                                    ) {
                                        const videoSource =
                                            mediaContentElement.querySelector(
                                                "source"
                                            );
                                        const videoUrl = videoSource
                                            ? videoSource.src
                                            : mediaContentElement.src;
                                        type = "video";
                                        content = null;
                                        url = videoUrl || null;
                                    } else if (
                                        mediaContentElement.tagName.toLowerCase() ===
                                        "img"
                                    ) {
                                        const imgUrl =
                                            mediaContentElement.src ||
                                            mediaContentElement
                                                .getAttribute("srcset")
                                                ?.split(" ")[0];
                                        type = "image";
                                        content = null;
                                        url = imgUrl || null;
                                    }
                                }
                                // Only return the message if a type was determined.
                                return type
                                    ? { sender, type, content, url }
                                    : null;
                            })
                            .filter((message) => message !== null);
                    }, chatUsername);

                    messageCount = messages.length;
                    console.log(
                        `Iteration ${iteration}: Found ${messageCount} messages.`
                    );

                    if (messageCount === previousMessageCount) {
                        console.log(
                            "No new messages loaded. Stopping scrolling."
                        );
                        break;
                    }
                    const limit = 50;

                    for (
                        let i = previousMessageCount;
                        i < Math.min(messageCount, limit);
                        i++
                    ) {
                        // Scroll to the message
                        await page.evaluate((index) => {
                            const messages =
                                document.querySelectorAll('div[role="row"]');
                            if (messages[index]) {
                                messages[index].scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                });
                            }
                        }, i);

                        // Take a screenshot every 3 messages
                        if ((i + 1) % 3 === 0 || i === messageCount - 1) {
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

                        // Wait a bit for new content to load
                        await page.waitForTimeout(1000);
                    }

                    previousMessageCount = messageCount;
                    iteration++;

                    log.info(
                        `Number of messages found in ${chatUsername}'s chat: ${messageCount}`
                    );
                    await page.waitForTimeout(7000);

                    // Write messages to a JSON file instead of a text file.
                    const jsonFilePath = `./src/storage/${chatUsername}_instagram_messages.json`;
                    const jsonContent = JSON.stringify({ messages }, null, 2);
                    await fs.mkdir(path.dirname(jsonFilePath), {
                        recursive: true,
                    });
                    await fs.writeFile(jsonFilePath, jsonContent, "utf8");
                    log.info(
                        `Messages for ${chatUsername} have been logged to ${jsonFilePath}`
                    );

                    // Take a screenshot of the chat
                    const screenshotPath = path.resolve(
                        `./${chatUsername}_instagram_screenshot.png`
                    );
                    // (Optionally, you can take a full screenshot of the chat if needed)
                    log.info(
                        `Screenshot of ${chatUsername}'s chat saved to ${screenshotPath}`
                    );

                    // Upload the JSON log to S3
                    const chatLogKey = `${username}/${chatUsername}/chat_log.json`;
                    const chatLogURL = await uploadToS3(
                        jsonFilePath,
                        chatLogKey
                    );
                    console.log(`Chat log uploaded to S3: ${chatLogURL}`);

                    await insertMessages(
                        username,
                        chatUsername,
                        { messages },
                        chatLogURL,
                        screenshotPaths,
                        "instagram"
                    );

                    // Clear screenshots for next iteration
                    screenshotPaths = [];
                    await page.waitForTimeout(2000);
                }

                console.log("Scrolling completed.");
            };

            // Call the scroll function for this chat.
            await scrollChat();
        }
    } catch (error: any) {
        log.error(
            `Error while processing Instagram messages: ${error.message}`
        );
    }
};
