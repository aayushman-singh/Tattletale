import { Page } from "playwright";
import { uploadToS3 } from "../mongoUtils";

export async function extractMedia(username: string, page: Page) {
    const filesData = {
        media: [],
        docs: [],
        links: [],
    };

    try {
        // Step 1: Open the group info menu
        await page.getByRole("button", { name: "Profile details" }).click();

        // Step 2: Navigate to "Media, links, and docs"
        await page
            .getByRole("button", { name: "Media, links and docs" })
            .click();

        // Step 3: Extract and upload media
        await page.getByRole("tab", { name: "Media" }).click();
        const mediaCheckboxes = await page.getByRole("checkbox").all();
        for (const checkbox of mediaCheckboxes) {
            await checkbox.click();
        }

        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: "Download" }).click();
        const download = await downloadPromise;

        const filepath = await download.path();
        const s3Key = `${username}/media/${download.suggestedFilename()}`;
        await uploadToS3(filepath, s3Key); // Upload media to S3
        filesData.media.push({ filename: download.suggestedFilename(), s3Key });

        // Step 4: Extract and upload documents
        await page.getByRole("tab", { name: "Docs" }).click();

        // Locate buttons with "Download" in their title attribute
        const downloadButtons = await page
            .locator('button[title*="Download"]')
            .all();
        for (const docButton of downloadButtons) {
            const downloadPromise = page.waitForEvent("download");
            await docButton.click();
            const download = await downloadPromise;

            const docFilepath = await download.path();
            const docS3Key = `${username}/docs/${download.suggestedFilename()}`;
            await uploadToS3(docFilepath, docS3Key); // Upload document to S3
            filesData.docs.push({
                filename: download.suggestedFilename(),
                s3Key: docS3Key,
            });
        }

        // Step 5: Extract links
        await page.getByRole("tab", { name: "Links" }).click();
        const linkRows = await page.getByRole("row").all();
        for (const row of linkRows) {
            const link = await row.getByRole("link").getAttribute("href");
            if (link) {
                filesData.links.push(link); // Add link to the list
            }
        }

        // Step 6: Close the modal
        await page
            .locator("header")
            .filter({ hasText: "xContact info" })
            .getByLabel("Close")
            .click();

        console.log("Media, documents, and links extracted successfully.");
        return JSON.stringify(filesData, null, 2);
    } catch (error) {
        console.error("Error during extraction:", error);
        throw error; // Re-throw the error for higher-level handling
    }
}
