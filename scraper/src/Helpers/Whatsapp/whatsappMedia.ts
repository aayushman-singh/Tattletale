import { Page } from "playwright";
import { uploadToS3 } from "../mongoUtils";
import dotenv from "dotenv";

dotenv.config();

interface FilesData {
    media: Array<{ filename: string; s3Key: string; url: string }>;
    docs: Array<{ filename: string; s3Key: string; url: string }>;
    links: string[];
}

const S3_BASE_URL =
    process.env.S3_BASE_URL ||
    "https://project-narc.s3.ap-south-1.amazonaws.com/";

export async function extractMedia(
    username: string,
    page: Page
): Promise<FilesData> {
    const filesData: FilesData = {
        media: [],
        docs: [],
        links: [],
    };

    try {
        // Step into group/profile info panel
        try {
            const videoCallContainer = page.locator(
                'div:has(span[data-icon="video-call"])'
            );
            await videoCallContainer
                .locator('button[title="Menu"][data-tab="6"]')
                .click({ timeout: 2000 });

            try {
                await page.click(
                    'li[role="button"] div[aria-label="Group info"]'
                );
            } catch {
                console.log(
                    "Group info not found, trying profile details button"
                );
            }
        } catch (error) {
            console.error("Error clicking menu button:", error);
        }

        try {
            await page
                .getByRole("button", {
                    name: /Profile details(, disappearing)?/,
                })
                .click({ timeout: 2000 });
        } catch (error) {
            console.log("Profile details button not clickable:", error);
        }

        await page
            .getByRole("button", { name: "Media, links and docs" })
            .click();

        // MEDIA TAB
        try {
            await page.getByRole("tab", { name: "Media" }).click();
            await page.waitForTimeout(1000);

            const mediaItems = await page
                .locator('div[role="listitem"][aria-label=" Image"]')
                .all();

            for (const mediaItem of mediaItems) {
                try {
                    await mediaItem.hover();
                    const checkbox = mediaItem.getByRole("checkbox");

                    if (!(await checkbox.isVisible())) {
                        await page
                            .locator("div")
                            .filter({
                                hasText: /^checkbox-round-uncheckedmsg$/,
                            })
                            .getByRole("button")
                            .nth(1)
                            .click();
                        await checkbox.waitFor({ state: "visible" });
                    }

                    await checkbox.click();
                } catch (e) {
                    console.error("Failed to select a media item:", e);
                    continue;
                }
            }

            if (mediaItems.length > 0) {
                try {
                    const downloadPromise = page.waitForEvent("download");
                    await page
                        .getByRole("button", { name: "Download" })
                        .click();
                    const download = await downloadPromise;
                    const filepath = await download.path();
                    const suggestedFilename = download.suggestedFilename();
                    const safeFilename = suggestedFilename.replace(/ /g, "_");
                    const s3Key = `${username}/media/${safeFilename}`;

                    await uploadToS3(filepath, s3Key);
                    filesData.media.push({
                        filename: suggestedFilename,
                        s3Key,
                        url: `${S3_BASE_URL}${s3Key}`,
                    });
                } catch (e) {
                    console.error("Media download failed:", e);
                }
            }
        } catch (error) {
            console.error("Failed to process Media tab:", error);
        }

        // DOCS TAB
        try {
            await page.getByRole("tab", { name: "Docs" }).click();
            await page.waitForSelector('div[role="row"]', { state: "visible" });
            await page.waitForTimeout(1000);

            const downloadButtons = await page
                .locator('div[role="button"][title^="Download"]')
                .all();
            console.log(`Found ${downloadButtons.length} download buttons`);

            const downloadedTitles = new Set();

            for (const downloadButton of downloadButtons) {
                try {
                    const buttonTitle = await downloadButton.getAttribute(
                        "title"
                    );
                    if (!buttonTitle || downloadedTitles.has(buttonTitle))
                        continue;

                    await downloadButton.evaluate((btn) =>
                        btn.scrollIntoView()
                    );
                    await page.waitForTimeout(500);

                    const downloadPromise = page.waitForEvent("download", {
                        timeout: 30000,
                    });

                    await downloadButton.evaluate((btn) =>
                        (btn as HTMLElement).click()
                    );

                    const download = await downloadPromise;
                    const docFilepath = await download.path();
                    const docSuggestedFilename = download.suggestedFilename();
                    const safeDocFilename = docSuggestedFilename.replace(
                        / /g,
                        "_"
                    );
                    const docS3Key = `${username}/docs/${safeDocFilename}`;

                    await uploadToS3(docFilepath, docS3Key);
                    filesData.docs.push({
                        filename: docSuggestedFilename,
                        s3Key: docS3Key,
                        url: `${S3_BASE_URL}${docS3Key}`,
                    });

                    downloadedTitles.add(buttonTitle);
                    await page.waitForTimeout(1000);
                } catch (e) {
                    console.error("Error processing a document download:", e);
                    continue;
                }
            }
        } catch (error) {
            console.error("Failed to process Docs tab:", error);
        }

        // LINKS TAB
        try {
            await page.getByRole("tab", { name: "Links" }).click();
            await page.waitForTimeout(1000);

            const linkRows = await page.getByRole("row").all();
            for (const row of linkRows) {
                try {
                    const linkElements = await row
                        .locator('a[title][href^="http"]')
                        .all();
                    for (const linkElement of linkElements) {
                        const href = await linkElement.getAttribute("href");
                        if (href) filesData.links.push(href);
                    }
                } catch (e) {
                    console.error("Error extracting links from a row:", e);
                }
            }
        } catch (error) {
            console.error("Failed to process Links tab:", error);
        }

        // Cleanup UI
        try {
            await page.getByLabel("Back", { exact: true }).click();
            await page.locator("header").getByLabel("Close").click();
            await page.waitForTimeout(1000);
        } catch (e) {
            console.error("Failed to clean up navigation:", e);
        }

        console.log("Media, documents, and links extracted successfully.");
        return filesData;
    } catch (error: any) {
        console.error("Fatal error in extractMedia:", error);
        throw error;
    }
}
