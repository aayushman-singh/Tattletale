import { Page } from "playwright";

interface InstagramUser {
    username: string;
    profile_pic_url: string;
    id: string;
}

interface ApiResponse {
    users: InstagramUser[];
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
        // Select correct button based on list type
        const selector =
            listType === "followers"
                ? 'a[href*="/followers/"]'
                : 'a[href*="/following/"]';

        // Click to open modal
        await this.page.goto(
                            `https://www.instagram.com/${username}/`
        );
        await this.page.waitForSelector(selector, { timeout: 100000 });
        await this.page.click(selector);

        // Wait for modal to open
        await this.page.waitForSelector('div[role="dialog"]', {
            timeout: 70000,
        });

        const extractedUsers: InstagramUser[] = [];
        const seenIds = new Set<string>();
        let scrollAttempts = 0;
        let hasMore = true;

        // Set up response listener
        this.page.on("response", async (response) => {
            const url = response.url();
            const expectedUrl = `https://www.instagram.com/api/v1/friendships/${this.instagram_id}/${listType}/`;

            if (url.startsWith(expectedUrl)) {
                try {
                    const data: ApiResponse = await response.json();

                    if (data.users && Array.isArray(data.users)) {
                        for (const user of data.users) {
                            if (
                                !seenIds.has(user.id) &&
                                extractedUsers.length < maxItems
                            ) {
                                seenIds.add(user.id);
                                extractedUsers.push({
                                    username: user.username,
                                    profile_pic_url: user.profile_pic_url,
                                    id: user.id,
                                });
                            }
                        }

                        hasMore = data.big_list && !!data.next_max_id;
                    }
                } catch (error) {
                    console.error(`Error processing response:`, error);
                }
            }
        });

        // Scroll until we have enough items or no more data
        while (
            extractedUsers.length < maxItems &&
            hasMore &&
            scrollAttempts < 15
        ) {
            const modalSelector =
                'div[role="dialog"] div[style*="overflow-y: auto"]';
            await this.page.waitForSelector(modalSelector);

            // Scroll the modal
            await this.page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.scrollTop = element.scrollHeight;
                }
            }, modalSelector);

            // Wait for potential new data to load
            await this.page.waitForTimeout(2000);

            // Check if we got new users
            const previousCount = extractedUsers.length;
            await this.page.waitForTimeout(1000); // Wait for potential API responses

            if (previousCount === extractedUsers.length) {
                scrollAttempts++;
            } else {
                scrollAttempts = 0;
            }

            if (scrollAttempts >= 3) {
                break;
            }
        }

        return extractedUsers;
    }
}

// Helper function for simple usage
export async function extractInstagramList(
    page: Page,
    instagram_id: string,
    username: string,
    listType: "followers" | "following",
    maxItems: number
): Promise<InstagramUser[]> {
    const extractor = new InstagramListExtractor(page, instagram_id);
    return await extractor.extractList(username,listType, maxItems);
}
