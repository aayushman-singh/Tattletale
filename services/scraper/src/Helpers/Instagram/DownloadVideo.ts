import { Page } from "playwright";

export interface MediaDetail {
    url: string;
    type: "video" | "image";
    width: number;
    height: number;
    resolution: string;
}

/**
 * Extracts media details (video or image) from the page.
 *
 * This function searches for JSON script tags containing media data,
 * sorts the available media by quality (width/height), and returns
 * the highest quality media's details.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves to a MediaDetail object, or null if none found.
 */
export async function extractVideos(page: Page): Promise<MediaDetail | null> {
    return await page.evaluate(() => {
        // Attempt to find media data in JSON script tags.
        let mediaData: any = null;
        const scriptTags = document.querySelectorAll(
            'script[type="application/json"]'
        );

        for (const tag of Array.from(scriptTags)) {
            try {
                const data = JSON.parse(tag.textContent || "");
                const mediaPath =
                    data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]
                        ?.__bbox?.result?.data
                        ?.xdt_api__v1__media__shortcode__web_info?.items?.[0];

                if (mediaPath?.video_versions || mediaPath?.image_versions2) {
                    mediaData = mediaPath;
                    break;
                }
            } catch (error) {
                // If JSON parsing fails, skip this tag.
                continue;
            }
        }

        if (!mediaData) {
            console.error("Media data not found in any script tag");
            return null;
        }

        // Process video versions if available.
        const videoUrls = (mediaData.video_versions || [])
            .sort((a: any, b: any) => b.width - a.width)
            .map((v: any) => ({
                url: v.url,
                width: v.width,
                height: v.height,
                type: "video" as const,
            }));

        // Process image candidates if available.
        const imageUrls = (mediaData.image_versions2?.candidates || [])
            .sort((a: any, b: any) => b.width - a.width)
            .map((c: any) => ({
                url: c.url,
                width: c.width,
                height: c.height,
                type: "image" as const,
            }));

        // Combine both media arrays.
        const allMediaSorted = [...videoUrls, ...imageUrls];

        if (allMediaSorted.length === 0) {
            console.error("No media URLs found");
            return null;
        }

        // The highest quality media is the first element after sorting.
        const highestQuality = allMediaSorted[0];

        return {
            url: highestQuality.url,
            type: highestQuality.type,
            width: highestQuality.width,
            height: highestQuality.height,
            resolution: `${highestQuality.width}x${highestQuality.height}`,
        };
    });
}
