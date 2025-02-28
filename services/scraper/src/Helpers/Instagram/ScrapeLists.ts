import { Page } from "playwright";

interface InstagramUser {
    username: string;
    profile_pic_url: string;
    id: string;
    full_name: string;
}

interface ApiResponse {
    users: any[]; // using 'any' to allow extra fields; we'll pick what we need.
    big_list: boolean;
    page_size: number;
    next_max_id?: string;
    status: string;
}

export class InstagramListExtractor {
    private page: Page;
    private instagram_id: string;

    constructor(page: Page, instagram_id: string) {
        this.page = page;
        this.instagram_id = instagram_id;
    }

    async extractList(
        username: string,
        listType: "followers" | "following",
        maxItems: number = 50
    ): Promise<InstagramUser[]> {
        console.log(`📌 Starting extraction: ${listType} for ${username}`);

        // Select correct button based on list type.
        const selector =
            listType === "followers"
                ? 'a[href*="/followers/"]'
                : 'a[href*="/following/"]';

        // Navigate to profile page.
        await this.page.goto(`https://www.instagram.com/${username}/`);
        
        // Container for extracted users from API responses.
        const extractedUsers: InstagramUser[] = [];
        const seenIds = new Set<string>();
        // Set up a response listener to capture API responses.
        this.page.on("response", async (response) => {
            const url = response.url();

            // Expected URL starts with the given endpoint.
            const expectedUrl = `https://www.instagram.com/api/v1/friendships/`;
            if (url.match(expectedUrl)) {
                console.log(`🟢 API Response detected: ${url}`);
                try {
                    const data: ApiResponse = await response.json();
                    console.log(
                        `📥 Raw API Response:`,
                        JSON.stringify(data, null, 2)
                    );
                    if (data.users && Array.isArray(data.users)) {
                        for (const user of data.users) {
                            // Use "pk" or "id" as a unique identifier.
                            const userId = user.pk || user.id;
                            if (
                                userId &&
                                !seenIds.has(userId) &&
                                extractedUsers.length < maxItems
                            ) {
                                seenIds.add(userId);
                                extractedUsers.push({
                                    id: userId,
                                    username: user.username,
                                    profile_pic_url: user.profile_pic_url,
                                    full_name: user.full_name,
                                });
                                console.log(
                                    `✅ Extracted User: ${user.username} (${userId})`
                                );
                            }
                        }
                    } else {
                        console.log(`⚠️ No valid users in API response.`);
                    }
                } catch (error) {
                    console.error(`❌ Error processing response:`, error);
                }
            }
        });
        
        await this.page.waitForSelector(selector, { timeout: 10000 });
        await this.page.click(selector);
        // Wait for the modal to open.
        await this.page.waitForSelector('div[role="dialog"]', {
            timeout: 10000,
        });

        // Scrolling loop using tiles (the tiles trigger additional API calls).
        let scrollAttempts = 0;
        const maxScrollAttempts = 5;
        const tileSelector =
            "div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1pi30zi.x1swvt13.xwib8y2.x1y1aw1k.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1";

        while (
            scrollAttempts < maxScrollAttempts &&
            extractedUsers.length < maxItems
        ) {
            const tiles = await this.page.$$(tileSelector);
            console.log(`Found ${tiles.length} ${listType} tiles.`);
            if (tiles.length > 0) {
                // Scroll to the last tile to trigger new content.
                await tiles[tiles.length - 1].scrollIntoViewIfNeeded();
            }
            // Wait for new API responses.
            await this.page.waitForTimeout(10000);
            scrollAttempts++;
            console.log(`Scroll attempt ${scrollAttempts}`);
        }

        console.log(
            `✅ Extraction completed: ${extractedUsers.length} users found.`
        );
        return extractedUsers;
    }
}

// Helper function for simple usage.
export async function extractInstagramList(
    page: Page,
    instagram_id: string,
    username: string,
    listType: "followers" | "following",
    maxItems: number
): Promise<InstagramUser[]> {
    const extractor = new InstagramListExtractor(page, instagram_id);
    return await extractor.extractList(username, listType, maxItems);
}
