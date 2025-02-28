import { Log } from "crawlee";
import { Page } from "playwright";
import { uploadScreenshotToMongo } from "../mongoUtils";


export const captureTimelineScreenshots = async (
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