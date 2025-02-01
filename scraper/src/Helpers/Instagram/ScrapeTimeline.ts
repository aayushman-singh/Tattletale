import { Page } from "playwright";
import fs from "fs/promises";

/**
 * Scrapes the Instagram timeline by capturing GraphQL API responses.
 * @param page Playwright Page instance (Assumes navigation and login are already handled).
 * @param maxScrolls Number of times to scroll to load more posts (default: 3).
 * @returns Promise resolving to an array of timeline post objects.
 */
export async function scrapeTimeline(
    page: Page,
    maxScrolls: number = 3
): Promise<any[]> {
    const timelineItems: any[] = [];

    // Set up response listener for GraphQL timeline API.
    page.on("response", async (response) => {
        try {
            if (response.url().includes("instagram.com/graphql/query")) {
                const json = await response.json();
                const edges =
                    json?.data?.xdt_api__v1__feed__timeline__connection?.edges;

                if (edges && edges.length > 0) {
                    const nodes = edges.map((edge) => edge.node);
                    timelineItems.push(...nodes);
                    console.log(`📥 Captured ${nodes.length} timeline items`);
                }
            }
        } catch (error) {
            console.error("❌ Error processing response:", error);
        }
    });

    // Scroll to load more content.
    for (let i = 0; i < maxScrolls; i++) {
        await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight)
        );
        await page.waitForTimeout(2000);
    }

    // Wait for any remaining network activity.
    await page.waitForTimeout(5000);

    console.log(
        `✅ Saved ${timelineItems.length} items to instagram_timeline.json`
    );

    return timelineItems;
}
