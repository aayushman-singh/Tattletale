import { Page } from "playwright";

export interface ImageData {
    src: string;
    alt: string;
    width: number;
    height: number;
    resolution: string;
}

/**
 * Extracts images from a container element identified by an XPath.
 *
 * @param page - The Playwright Page instance.
 * @returns An array of image data.
 */
export async function extractImages(page: Page): Promise<ImageData[]> {
    return await page.evaluate(() => {

        function getElementByXPath(xpath: string): HTMLElement | null {
            const segments = xpath.split("/");
            const mainContentIdentifiers = ["article", "section"];
            const mainSegment = segments.findIndex((seg) =>
                mainContentIdentifiers.some((id) =>
                    seg.toLowerCase().includes(id)
                )
            );

            if (mainSegment !== -1) {
                const simplifiedXPath = segments.slice(mainSegment).join("/");
                return document.evaluate(
                    `//${simplifiedXPath}`,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue as HTMLElement;
            }
            return null;
        }

        // Adjust the XPath to target the container element
        const container = getElementByXPath(
            '//*[@id="mount_0_0_TX"]/div/div/div[2]/div/div/div[1]/div[1]/div[1]/section/main/div/div[1]/div/div[1]'
        );

        if (container) {
            // Gather image details from the container
            const images = Array.from(container.querySelectorAll("img"))
                .map((img) => ({
                    src: img.src,
                    alt: img.alt || "No alt text",
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height,
                    resolution: `${img.naturalWidth || img.width}x${
                        img.naturalHeight || img.height
                    }`,
                }))
                .filter(
                    (img) =>
                        !img.src.startsWith("data:image") &&
                        img.width > 0 &&
                        img.height > 0
                )
                .sort((a, b) => b.width * b.height - a.width * a.height);

            return images;
        } else {
            console.error("Container not found");
            return [];
        }
    });
}
