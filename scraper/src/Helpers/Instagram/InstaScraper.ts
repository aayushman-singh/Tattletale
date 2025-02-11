import {
    insertFollowers,
    insertFollowing,
    uploadScreenshotToMongo,
    insertObject,
    uploadChats,
    uploadToS3,
    insertInstagramProfile,
    insertTimeline,
} from "../mongoUtils";
import { BrowserContext, Page, chromium } from "playwright";
import path from "path";
import { getLoginActivity } from "./InstagramLoginActivity";
import { InstagramProfileExtractor } from "./ScrapeProfile";
import { extractInstagramList } from "./ScrapeLists";
import { scrapeTimeline } from "./ScrapeTimeline";
import { openAllInstagramMessagesAndLog } from "./ScrapeMessages";
import { captureTimelineScreenshots } from "./InstagramTimeline";

export const InstaScraper = async (username: string, password: string) => {
    if (!username || !password) {
        console.error("Username or password missing. Please provide both.");
        process.exit(1);
    }

    // Launch persistent browser context
    const context: BrowserContext = await chromium.launchPersistentContext(
        "./instagram_session",
        {
            headless: false,
            slowMo: 1000,
            args: ["--enable-http2", "--tls-min-v1.2"],
        }
    );

    const page: Page = await context.newPage();
    await page.goto("https://www.instagram.com/");

    // Check if login form is present
    const loginFormPresent = await page.$('input[name="username"]');
    if (loginFormPresent) {
        console.log("Not logged in; performing login...");
        try {
            await page.fill('input[name="username"]', username);
            await page.fill('input[name="password"]', password);
            console.log("Filled in login details.");

            await Promise.all([
                page.click('button[type="submit"]'),
                page.waitForNavigation({ waitUntil: "networkidle" }),
            ]);
            console.log("Logged in successfully.");
        } catch (error: any) {
            console.error("Login failed: " + error.message);
            process.exit(1);
        }
    } else {
        console.log("Already logged in with persistent session.");
    }

    try {
        // Navigate to user profile
        console.log(`Navigating to profile page: ${username}`);
        await page.goto(`https://www.instagram.com/${username}/`, {
            waitUntil: "domcontentloaded",
            timeout: 15000,

        });

        let resultId: string | null = null;
        try {
            const extractor = new InstagramProfileExtractor(page);
            console.log("Extracting profile data...");

            // Wait a bit and trigger API requests
            await page.waitForTimeout(3000);
            await page.evaluate(() => window.scrollBy(0, 200));

            // Extract profile data
            const profileData = await extractor.captureProfileData(
                username,
                20000
            );
            if (!profileData) {
                throw new Error("❌ Profile data not found.");
            }

            await insertInstagramProfile(username, profileData);

            const followerCount = profileData.follower_count;
            const followingCount = profileData.following_count;

            const screenshotPath = `profile_${username}.png`;

            await page.screenshot({
                path: screenshotPath,
                fullPage: false,
            });

            resultId = await uploadScreenshotToMongo(
                username,
                screenshotPath,
                "profilePage",
                "instagram",
            );

            const instagram_id = profileData.instagram_id;
            await page.goto(`https://instagram.com/${username}`);
            const timelineObject = await scrapeTimeline(page);
            await insertTimeline(username, timelineObject, 'instagram');

            try {
                const followersData = await extractInstagramList(
                    page,
                    instagram_id,
                    username,
                    "followers",
                    followerCount
                );
                await insertFollowers(username, followersData, "instagram");
            } catch (error: any) {
                console.error(
                    `Error while scraping followers: ${error.message}. Moving on to following list.`,
                );
            }

            try {
              const followingData = await extractInstagramList(
                  page,
                  instagram_id,
                  username,
                  "following",
                  followingCount
              );
                await insertFollowing(username, followingData, "instagram");

            } catch (error: any) {
                console.error(
                    `Error while scraping following: ${error.message}. Moving on`,
                );
            }

            const loginActivityObject = await getLoginActivity(page);
            await insertObject(username, loginActivityObject, 'login_activity', 'instagram');

             await page.waitForTimeout(4000);
            await openAllInstagramMessagesAndLog(page, username);
        } catch (error: any) {
            console.error(`Error extracting profile data: ${error.message}`);
        }

        return resultId; // Ensure something is returned
    } catch (error: any) {
        console.error(`Error processing profile: ${error.message}`);
    } finally {
        console.log("Closing browser session...");
        await context.close();
    }
};
