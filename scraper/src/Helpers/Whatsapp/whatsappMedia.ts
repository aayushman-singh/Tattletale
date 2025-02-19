import { Page } from "playwright";
import { uploadToS3 } from "../mongoUtils";
import dotenv from 'dotenv';

dotenv.config()

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
        // Refactor this eventually
         try {
         
             const videoCallContainer = page.locator(
                 'div:has(span[data-icon="video-call"])'
             );

             await videoCallContainer.locator('button[title="Menu"][data-tab="6"]').click({timeout:2000});

             try {
                 await page.click(
                     'li[role="button"] div[aria-label="Group info"]'
                 );
             } catch (error) {
                 console.log(
                     "Group info not found, trying profile details button"
                 );
               
             }
         } catch (error) {
             console.error(
                 "Error clicking the menu button in the video call container:",
                 error
             );
         }
        try {
             await page
                 .getByRole("button", {
                     name: /Profile details(, disappearing)?/,
                 })
                 .click({timeout: 2000});
        } catch (error) {
            console.log(error);
        }
        await page
            .getByRole("button", { name: "Media, links and docs" })
            .click();

      
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

       
        const downloadButtons = await page
            .locator('div[role="button"][title^="Download"]')
            .all();
        console.log(`Found ${downloadButtons.length} download buttons`);

        const downloadedTitles = new Set(); 

        for (const downloadButton of downloadButtons) {
            try {
               
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

              
                await downloadButton.evaluate((button) =>
                    button.scrollIntoView()
                );
                await page.waitForTimeout(500); 

              
                const downloadPromise = page.waitForEvent("download", {
                    timeout: 30000,
                });

               
                await downloadButton.evaluate((button) => {
                    (button as HTMLElement).click();
                });

                const download = await downloadPromise;
                const docFilepath = await download.path();

                if (!docFilepath) {
                    console.error("Download failed: No file path received");
                    continue;
                }

               
                const docSuggestedFilename = download.suggestedFilename();
                const safeDocFilename = docSuggestedFilename.replace(/ /g, "_");

                const docS3Key = `${username}/docs/${safeDocFilename}`;
                await uploadToS3(docFilepath, docS3Key);

                filesData.docs.push({
                    filename: docSuggestedFilename,
                    s3Key: docS3Key,
                    url: `${S3_BASE_URL}${docS3Key}`,
                });

               
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

       
        await page.getByLabel("Back", { exact: true }).click();
        await page.locator("header").getByLabel("Close").click();
        await page.waitForTimeout(1000);

        console.log("Media, documents, and links extracted successfully.");
        return filesData;
    } catch (error: any) {
        console.error(
            "Error during extraction:",
            error instanceof Error ? error.message : String(error)
        );
        throw error;
    }
}
