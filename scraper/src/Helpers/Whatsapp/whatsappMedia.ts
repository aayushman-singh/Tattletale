import { Page } from "playwright";
import { uploadToS3 } from "../mongoUtils";

interface FilesData {
    media: Array<{ filename: string; s3Key: string; url: string }>;
    docs: Array<{ filename: string; s3Key: string; url: string }>;
    links: string[];
}

// Update this constant to match your S3 bucket's URL
const S3_BASE_URL = "https://your-s3-bucket.s3.amazonaws.com/";

export async function extractMedia(
    username: string,
    page: Page
): Promise<string> {
    const filesData: FilesData = {
        media: [],
        docs: [],
        links: [],
    };

    try {
        // Profile navigation
        await page
            .getByRole("button", { name: /Profile details(, disappearing)?/ })
            .click();
        await page
            .getByRole("button", { name: "Media, links and docs" })
            .click();

        // Media extraction
        await page.getByRole("tab", { name: "Media" }).click();
        await page.waitForTimeout(1000);

        const mediaItems = await page
            .locator('div[role="listitem"][aria-label=" Image"]')
            .all();

        for (const mediaItem of mediaItems) {
            await mediaItem.hover();
            const checkbox = mediaItem.getByRole("checkbox");
            const isCheckboxVisible = await checkbox.isVisible();

            if (!isCheckboxVisible) {
                await page
                    .locator("div")
                    .filter({ hasText: /^checkbox-round-uncheckedmsg$/ })
                    .getByRole("button")
                    .nth(1)
                    .click();

                await checkbox.waitFor({ state: "visible" });
            }

            await checkbox.click();
        }

        // Handle media download
        if (mediaItems.length > 0) {
            const downloadPromise = page.waitForEvent("download");
            await page.getByRole("button", { name: "Download" }).click();
            const download = await downloadPromise;

            const filepath = await download.path();

            // Replace spaces with underscores in the filename
            const suggestedFilename = download.suggestedFilename();
            const safeFilename = suggestedFilename.replace(/ /g, "_");

            const s3Key = `${username}/media/${safeFilename}`;
            await uploadToS3(filepath, s3Key);

            filesData.media.push({
                filename: suggestedFilename,
                s3Key,
                url: `${S3_BASE_URL}${s3Key}`,
            });
        }

        await page.getByRole("tab", { name: "Docs" }).click();
        await page.waitForSelector('div[role="row"]', { state: "visible" });
        await page.waitForTimeout(1000);

        // Try a more specific selector that matches the WhatsApp web structure
        const downloadButtons = await page
            .locator('div[role="button"][title^="Download"].x9f619')
            .all();
        console.log(`Found ${downloadButtons.length} download buttons`); // Debug log

        const downloadedTitles = new Set(); // Track downloaded files to avoid duplicates

        for (const downloadButton of downloadButtons) {
            try {
                // Get button title and check if already downloaded
                const buttonTitle = await downloadButton.getAttribute("title");
                console.log(`Found document: ${buttonTitle}`);

                if (!buttonTitle) {
                    console.log("Skipping button without title");
                    continue;
                }

                if (downloadedTitles.has(buttonTitle)) {
                    console.log(`Already downloaded ${buttonTitle}, skipping`);
                    continue;
                }

                // Scroll button into view
                await downloadButton.evaluate((button) =>
                    button.scrollIntoView()
                );
                await page.waitForTimeout(500); // Short pause for scroll completion

                // Set up download promise before click
                const downloadPromise = page.waitForEvent("download", {
                    timeout: 30000,
                });

                // Click with scrollIntoView assurance
                await downloadButton.evaluate((button) => {
                    (button as HTMLElement).click();
                });

                const download = await downloadPromise;
                const docFilepath = await download.path();

                if (!docFilepath) {
                    console.error("Download failed: No file path received");
                    continue;
                }

                // Replace spaces with underscores in the filename
                const docSuggestedFilename = download.suggestedFilename();
                const safeDocFilename = docSuggestedFilename.replace(/ /g, "_");

                const docS3Key = `${username}/docs/${safeDocFilename}`;
                await uploadToS3(docFilepath, docS3Key);

                filesData.docs.push({
                    filename: docSuggestedFilename,
                    s3Key: docS3Key,
                    url: `${S3_BASE_URL}${docS3Key}`,
                });

                // Add to downloaded titles only after successful upload
                downloadedTitles.add(buttonTitle);

                await page.waitForTimeout(1000);
            } catch (error: any) {
                console.error("Error processing download:", error);
                console.error("Error details:", {
                    message: error.message,
                    stack: error.stack,
                });
                continue;
            }
        }

        // Links extraction
        await page.getByRole("tab", { name: "Links" }).click();
        await page.waitForTimeout(1000);

        const linkRows = await page.getByRole("row").all();

        for (const row of linkRows) {
            const linkElements = await row
                .locator('a[title][href^="http"]')
                .all();
            for (const linkElement of linkElements) {
                const href = await linkElement.getAttribute("href");
                if (href) {
                    filesData.links.push(href);
                }
            }
        }

        // Close modal
        await page.getByLabel("Back", { exact: true }).click();
        await page.locator("header").getByLabel("Close").click();
        await page.waitForTimeout(1000);

        console.log("Media, documents, and links extracted successfully.");
        return JSON.stringify(filesData, null, 2);
    } catch (error: any) {
        console.error(
            "Error during extraction:",
            error instanceof Error ? error.message : String(error)
        );
        throw error;
    }
}
