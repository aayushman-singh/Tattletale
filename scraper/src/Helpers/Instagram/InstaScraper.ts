import { Log, PlaywrightCrawler } from "crawlee";
import {
    insertFollowers,
    insertFollowing,
    uploadScreenshotToMongo,
    insertObject,
    uploadChats,
    uploadToS3,
    insertInstagramProfile,
    insertTimeline,
} from "../mongoUtils.js"; // Use ESM import
import { BrowserContext, Page } from "playwright";
import { promises as fs, PathLike } from "fs";
import path from "path"; // To handle file paths
import { getLoginActivity } from "./InstagramLogin";
import { InstagramProfileExtractor } from "./ScrapeProfile.js";
import { extractInstagramList } from "./ScrapeLists";
import { scrapeTimeline } from "./ScrapeTimeline.js";
import { openAllInstagramMessagesAndLog } from "./ScrapeMessages.js";

const saveSession = async (page: Page, filePath: string) => {
    const storageState = await page.context().storageState();
    await fs.writeFile(filePath, JSON.stringify(storageState));
    console.log("Session data saved.");
};

const loadSession = async (
    browserContext: BrowserContext,
    filePath: string,
) => {
    try {
        const storageState = JSON.parse(await fs.readFile(filePath, "utf8"));
        await browserContext.addInitScript(() => {
            window.localStorage.setItem(storageState.key, storageState.value);
        });
        console.log("Session data loaded.");
    } catch (error: any) {
        console.warn("No session data found. Starting fresh.");
    }
};


const captureTimelineScreenshots = async (
    page: Page,
    log: Log,
    username: string,
) => {
    log.info("Capturing timeline screenshots...");
    const timelineSelector = "section > main > div > div"; // Adjust selector based on your page structure

    try {
        await page.goto("https://www.instagram.com");
        await page.waitForSelector(timelineSelector, { timeout: 30000 });

        // Handle "Not Now" notification pop-up
        try {
            const notNowButtonSelector = 'button:has-text("Not Now")'; // Adjust if necessary
            await page.waitForSelector(notNowButtonSelector, { timeout: 5000 });
            await page.click(notNowButtonSelector);
            log.info("Notification pop-up dismissed successfully.");
        } catch (error: any) {
            log.info(
                "Notification pop-up did not appear or was already dismissed.",
            );
        }

        // Loop to capture and upload screenshots
        for (let i = 1; i <= 3; i++) {
            const screenshotPath = `timeline_${username}_${i}.png`; // Generate path to save the screenshot
            await page.screenshot({ path: screenshotPath, fullPage: false }); // Capture screenshot

            await page.evaluate(() => window.scrollBy(0, window.innerHeight)); // Scroll down
            await page.waitForTimeout(2000);

            log.info(`Captured screenshot ${i}.`);

            // Upload screenshot to MongoDB and insert reference
            await uploadScreenshotToMongo(
                username,
                screenshotPath,
                `timeline_${i}`,
                "instagram",
            );

            log.info(`Uploaded timeline screenshot ${i} to MongoDB.`);
        }

        log.info("All screenshots inserted into MongoDB.");
    } catch (error: any) {
        log.error(`Failed to capture screenshots: ${error.message}`);
    }
};

export const InstaScraper = async (username: string, password: string) => {
    let isLoggedIn = false; // Variable to track login status

    if (!username || !password) {
        console.error("Username or password missing. Please provide both.");
        process.exit(1); // Exit if username or password is not provided
    }

    const crawler = new PlaywrightCrawler({
        launchContext: {
            launchOptions: {
                headless: false,
                slowMo: 1000,
                args: ["--enable-http2", "--tls-min-v1.2"],
            }, // Non-headless mode with delay between actions
        },
        requestHandlerTimeoutSecs: 500,
        maxRequestRetries: 0, // Disable retries
        preNavigationHooks: [
            async ({ page, log }) => {
                const sessionFilePath = "./session.json";
                if (!isLoggedIn) {
                    await loadSession(page.context(), sessionFilePath);
                }
                if (!isLoggedIn) {
                    // Only attempt login if not already logged in
                    log.info("Performing login...");
                    try {
                        // Go to Instagram login page
                        await page.goto(
                            "https://www.instagram.com/accounts/login/",
                        );
                        await page.waitForSelector('input[name="username"]', {
                            timeout: 30000,
                        });

                        // Fill in login details
                        await page.fill('input[name="username"]', username);
                        await page.fill('input[name="password"]', password);
                        log.info("Filled in login details.");

                        // Click the login button and wait for the navigation to complete
                        await Promise.all([
                            page.click('button[type="submit"]'),
                            page.waitForNavigation(),
                        ]);
                        log.info("Logged in successfully.");
                        isLoggedIn = true; // Mark as logged in
                        await saveSession(page, sessionFilePath);
                        // Capture screenshots of the timeline before starting scraping

                        //await captureTimelineScreenshots(page, log, username);
                        
                    } catch (error: any) {
                        log.error(
                            "Login failed or not required: " + error.message,
                        );
                    }
                } else {
                    log.info("Already logged in.");
                }
            },
        ],
        requestHandler: async ({ request, page, log }) => {
            log.info(`Processing ${request.url}`);
            let resultId;
            try {
                const extractor = new InstagramProfileExtractor(page);

                await page.goto(`https://www.instagram.com/${username}/`, {
                    waitUntil: "networkidle",
                    timeout: 15000,
                });
                log.info("Navigated to profile page.");

                // // Wait a bit and trigger API requests
                // await page.waitForTimeout(3000);
                // await page.evaluate(() => window.scrollBy(0, 200));

                // // Extract profile data
                // const profileData = await extractor.captureProfileData(
                //     username,
                //     20000
                // );
                // if (!profileData) {
                //     throw new Error("❌ Profile data not found.");
                // }

                // await insertInstagramProfile(username, profileData);

                // const followerCount = profileData.follower_count;
                // const followingCount = profileData.following_count;

                // const screenshotPath = `profile_${username}.png`; 

                // await page.screenshot({
                //     path: screenshotPath,
                //     fullPage: false,
                // }); 
               
                // resultId = await uploadScreenshotToMongo(
                //     username,
                //     screenshotPath,
                //     "profilePage",
                //     "instagram",
                // );
                // const instagram_id = profileData.instagram_id;
                // await page.goto(`https://instagram.com/${username}`);
                // const timelineObject = await scrapeTimeline(page);
                // await insertTimeline(username, timelineObject, 'instagram');
                
                // try {
                //     const followersData = await extractInstagramList(
                //         page,
                //         instagram_id,
                //         username,
                //         "followers",
                //         followerCount
                //     );
                //     await insertFollowers(username, followersData, "instagram");
                // } catch (error: any) {
                //     log.error(
                //         `Error while scraping followers: ${error.message}. Moving on to following list.`,
                //     );
                // }

                // try {
                //   const followingData = await extractInstagramList(
                //       page,
                //       instagram_id,
                //       username,
                //       "following",
                //       followingCount
                //   );
                //     await insertFollowing(username, followingData, "instagram");
                // } catch (error: any) {
                //     log.error(
                //         `Error while scraping following: ${error.message}. Moving on`,
                //     );
                // }
               
                // const loginActivityObject = await getLoginActivity(page);
                // await insertObject(username, loginActivityObject, 'login_activity', 'instagram');
                //  await page.waitForTimeout(4000);
                 await openAllInstagramMessagesAndLog(page, log, username);
                return resultId;
            } catch (error: any) {
                log.error(`Error processing ${request.url}: ${error.message}`);
                return null;
            }
        },

        failedRequestHandler: async ({ request, log }) => {
            log.error(
                `Failed to process ${request.url}. Moving on to the next task.`,
            );
        },
    });

    await crawler.run([{ url: `https://www.instagram.com/${username}/` }]);
};
