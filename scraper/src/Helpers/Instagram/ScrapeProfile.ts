import { Page } from "playwright";
import fs from "fs/promises";

interface ExtractedProfileData {
    instagram_id: string;
    media_count: number;
    following_count: number;
    follower_count: number;
    full_name: string;
    username: string;
    is_private: boolean;
}

interface InstagramGraphQLResponse {
    data?: {
        user?: {
            pk?: string;
            media_count?: number;
            following_count?: number;
            follower_count?: number;
            full_name?: string;
            username?: string;
            is_private?: boolean;
        };
    };
}

export class InstagramProfileExtractor {
    private page: Page;
    private resolveData: ((value: ExtractedProfileData) => void) | null = null;
    private timeoutId: NodeJS.Timeout | null = null;
    private isCleanedUp = false;

    constructor(page: Page) {
        this.page = page;
    }

    private async logToFile(entry: Record<string, unknown>): Promise<void> {
        try {
            const logEntry = JSON.stringify({
                timestamp: new Date().toISOString(),
                ...entry,
            });
            await fs.appendFile("instagram_log.json", logEntry + "\n");
        } catch (error) {
            console.error("Failed to write to log file:", error);
        }
    }

    private isValidUserProfile(data: InstagramGraphQLResponse): boolean {
        const user = data?.data?.user;
        return !!(
            user &&
            user.pk &&
            user.username &&
            typeof user.media_count === "number" &&
            typeof user.following_count === "number" &&
            typeof user.follower_count === "number" &&
            typeof user.full_name === "string" &&
            typeof user.is_private === "boolean"
        );
    }

    private extractProfileData(
        data: InstagramGraphQLResponse
    ): ExtractedProfileData | null {
        const user = data.data?.user;
        if (!user || !user.pk || !user.username) return null;

        return {
            instagram_id: user.pk,
            media_count: user.media_count ?? 0,
            following_count: user.following_count ?? 0,
            follower_count: user.follower_count ?? 0,
            full_name: user.full_name ?? "",
            username: user.username,
            is_private: user.is_private ?? false,
        };
    }

    async captureProfileData(
        username: string,
        timeoutMs: number = 20000
    ): Promise<ExtractedProfileData> {
        return new Promise((resolve, reject) => {
            this.resolveData = resolve;
            this.timeoutId = setTimeout(() => {
                this.cleanup();
                reject(new Error("❌ Timeout: No user profile data found."));
            }, timeoutMs);

            // ✅ Listen for GraphQL responses
            this.page.on("response", async (response) => {
                const url = response.url();
                if (!url.includes("instagram.com/graphql/query")) return; // Ignore non-GraphQL responses

                try {
                    const contentType = response.headers()["content-type"];
                    if (
                        !contentType ||
                        !contentType.includes("application/json")
                    )
                        return; // Ignore non-JSON responses

                    const responseData: InstagramGraphQLResponse =
                        await response.json();
                    if (!this.isValidUserProfile(responseData)) return; // Ignore if no user data

                    // ✅ Extract & resolve profile data
                    const extractedData = this.extractProfileData(responseData);
                    if (extractedData && this.resolveData) {
                        this.resolveData(extractedData);
                        this.cleanup();
                    }
                } catch (error:any) {
                    this.logToFile({
                        type: "graphql_parse_error",
                        url,
                        error: error.message,
                    });
                }
            });

            // ✅ Navigate to Instagram profile
            this.page
                .goto(`https://www.instagram.com/${username}/`, {
                    waitUntil: "networkidle",
                    timeout: 15000,
                })
                .catch(async (error) => {
                    await this.logToFile({
                        type: "navigation_error",
                        message: "Navigation failed",
                        error: error.message,
                    });
                    this.cleanup();
                    reject(error);
                });
        });
    }

    private cleanup() {
        if (this.isCleanedUp) return;
        this.isCleanedUp = true;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}

export async function extractProfileData(
    username: string,
    page: Page,
    timeoutMs: number = 20000
): Promise<ExtractedProfileData> {
    const extractor = new InstagramProfileExtractor(page);
    return await extractor.captureProfileData(username, timeoutMs);
}
