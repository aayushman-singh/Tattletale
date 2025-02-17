import { chromium, BrowserContext, Page } from "playwright";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {
    insertFollowers,
    insertPosts,
    uploadChats,
    uploadScreenshotToMongo,
    uploadToS3,
} from "../mongoUtils";
import { __dirname } from "../../../../config";
import { randomDelay } from "../utils";


export async function scrapefacebookProfile(username:string, page:Page) {
    try {
        // Loop to take timeline screenshots
                await page.goto("https://www.facebook.com", {
                    waitUntil: "domcontentloaded",
                    timeout: 60000,
                });
        
        for (let i = 1; i <= 3; i++) {
            await randomDelay(2000, 4000); // Random delay between 2-4 seconds
            const screenshotPath = `facebook_screenshot_${i}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: false });
            console.log(`Took screenshot ${i}.`);

            await uploadScreenshotToMongo(
                username,
                screenshotPath,
                `timeline_${i}`,
                "facebook"
            );

            // Scroll down the page after each screenshot
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            console.log(`Scrolled down the page after screenshot ${i}.`);
        }

        // Navigate to the profile page and take a screenshot
        await page.goto("https://www.facebook.com/me/", {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        });
        const profileScreenshotPath = `profile_page.png`;
        await page.screenshot({ path: profileScreenshotPath, fullPage: false });

        const resultId = await uploadScreenshotToMongo(
            username,
            profileScreenshotPath,
            "profile",
            "facebook"
        );

        // Navigate to the friends list page
        await page.goto(`https://www.facebook.com/${username}/friends`);
        await page.waitForSelector('div[role="main"]');

        // Extract friends list
        try {
            // Locate the element with an ID starting with "mount_"
            await page.waitForSelector('[id^="mount_"]');
            console.log("Mount container found.");

            const friendsListContainerSelector =
                '[id^="mount_"] div > div:nth-child(1) > div > div.x9f619.x1n2onr6.x1ja2u2z > div > div > div.x78zum5.xdt5ytf.x1t2pt76.x1n2onr6.x1ja2u2z.x10cihs4 > div.x78zum5.xdt5ytf.x1t2pt76 > div > div > div.x6s0dn4.x78zum5.xdt5ytf.x193iq5w > div > div > div > div:nth-child(1) > div > div > div > div';

            await page.waitForSelector(friendsListContainerSelector);
            console.log("Friends list container found.");

            // Scroll to load all friends dynamically
            async function scrollToLoadAllFriends() {
                let previousHeight = 0;
                let currentHeight = await page.evaluate(
                    (selector) => document.querySelector(selector).scrollHeight,
                    friendsListContainerSelector
                );

                while (currentHeight !== previousHeight) {
                    previousHeight = currentHeight;
                    await page.evaluate(
                        (selector) =>
                            document.querySelector(selector).scrollBy(0, 500),
                        friendsListContainerSelector
                    );
                    await page.waitForTimeout(1000); // Wait for lazy loading
                    currentHeight = await page.evaluate(
                        (selector) =>
                            document.querySelector(selector).scrollHeight,
                        friendsListContainerSelector
                    );
                }
            }

            // Scroll to load all friends
            await scrollToLoadAllFriends();

            // Extract friend data
            const usersData = await page.evaluate((selector) => {
                const container = document.querySelector(selector);
                const friendTiles = container.querySelectorAll(
                    "div.x78zum5.x1q0g3np.x1a02dak.x1qughib > div"
                );

                console.log(`Total friend tiles found: ${friendTiles.length}`);

                const users: any[] | Promise<any[]> = [];
                friendTiles.forEach((friendTile, index) => {
                    const profilePic = friendTile.querySelector(
                        "div:nth-child(1) > a img"
                    );
                    const profilePicUrl = profilePic
                        ? (profilePic as HTMLImageElement).src
                        : null;

                    const nameElement = friendTile.querySelector(
                        "div.x1iyjqo2.x1pi30zi > div:nth-child(1) > a > span"
                    );
                    const userName = nameElement
                        ? nameElement.textContent.trim()
                        : null;

                    const profileAnchor = friendTile.querySelector(
                        "div:nth-child(1) > a"
                    );
                    const profileUrl = profileAnchor
                        ? (profileAnchor as HTMLAnchorElement).href
                        : null;

                    if (profilePicUrl && userName) {
                        users.push({
                            index: index + 1,
                            userName,
                            profilePicUrl,
                            profileUrl: profileUrl || "Profile URL not found",
                        });
                    }
                });

                return users;
            }, friendsListContainerSelector);

            console.log("Extracted Friend Data:", usersData);

            // Insert followers into MongoDB
            await insertFollowers(username, usersData, "facebook");
        } catch (error) {
            console.error(
                "An error occurred while extracting friends data:",
                error
            );
        } finally {
        }
    } catch (error) {
        console.error("An unexpected error occurred:", error);
    }
};
