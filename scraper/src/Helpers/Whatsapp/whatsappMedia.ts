import { Page } from "playwright";
import { uploadToS3 } from "../mongoUtils";// Assume this is your S3 upload utility
import fs from "fs";

export async function extractMedia(username: string, page: Page) {
    const filesData = {
        media: [],
        docs: [],
        links: [],
    };

    // Step 1: Open the group info menu
    await page.locator("#main").getByLabel("Menu").click();
    await page.getByRole("button", { name: "Group info" }).click();

    // Step 2: Navigate to "Media, links, and docs"
    const mediaTab = page
        .locator("div")
        .filter({ hasText: /^Media, links and docs\d$/ })
        .first();
    await mediaTab.click();
    await mediaTab.click(); // Sometimes needed for the tab to fully open
    await page.getByRole("button", { name: "Media, links and docs" }).click();

    // Step 3: Extract and upload media
    await page.getByRole("tab", { name: "Media" }).click();
    const mediaCheckbox = page.getByRole("checkbox");
    await mediaCheckbox.click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;

    const filepath = await download.path();
    const s3Key = `${username}/media/${download.suggestedFilename()}`;
    await uploadToS3(filepath, s3Key); // Upload media to S3
    filesData.media.push({ filename: download.suggestedFilename(), s3Key });

    // Step 4: Extract and upload documents
    await page.getByRole("tab", { name: "Docs" }).click();
    const docCheckbox = page.getByRole("checkbox");
    await docCheckbox.click();

    const download1Promise = page.waitForEvent("download");
    await page
        .getByRole("row", { name: "Document name:" })
        .getByRole("button")
        .click();
    const download1 = await download1Promise;

    const docFilepath = await download1.path();
    const docS3Key = `${username}/docs/${download1.suggestedFilename()}`;
    await uploadToS3(docFilepath, docS3Key); // Upload document to S3
    filesData.docs.push({
        filename: download1.suggestedFilename(),
        s3Key: docS3Key,
    });

    // Step 5: Extract links
    await page.getByRole("tab", { name: "Links" }).click();
    const linkRows = await page.getByRole("row").all();
    for (const row of linkRows) {
        const link = await row.getByRole("link").getAttribute("href");
        if (link) {
            filesData.links.push(link); // Add link to the list
        }
    }

    // Step 6: Save metadata to ${username}_files.json
    fs.writeFileSync(
        `${username}_files.json`,
        JSON.stringify(filesData, null, 2)
    );

    console.log("Media, documents, and links extracted successfully.");
}
