import { chromium, BrowserContext, Page } from "playwright";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {
    insertFollowers,
    insertPosts,
    uploadChats,
    uploadScreenshotToMongo,
    uploadToS3,
} from "../mongoUtils";

import path, { dirname } from "path";
import { scrapeFacebookPosts } from "./FacebookPosts";
import { scrapeFacebookChats } from "./FacebookChats";
import { __dirname } from "../../../../config";
import { scrapeFacebookActivity } from "./FacebookLogin";
import { scrapefacebookProfile } from "./FacebookProfile";
// Use the stealth plugin to avoid detection

puppeteer.use(StealthPlugin());


export async function scrapeFacebook(
    email: string,
    password: string,
    pin: string,
    range?: any,
    postLimit?: number,
    messageLimit?: number,
    chatLimit?: number,
) {
    let context: BrowserContext | null = null;
    try {
        let resultId;
        // Launch the browser
        context = await chromium.launchPersistentContext("./fb_context",{
            headless: false,
            slowMo: 500,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    
        const pages = context.pages();
        const page: Page = pages.length > 0 ? pages[0] : await context.newPage();

        // Navigate to Facebook login page
        await page.goto("https://www.facebook.com/", {
            waitUntil: "domcontentloaded", timeout: 60000
        });

       // Check if the user is already logged in
       const isLoggedIn = await page.evaluate(() => {
        // Facebook's homepage shows different elements when logged in
        return !!document.querySelector('[aria-label="Create a post"]'); // Example selector for logged-in user menu
    });

    if (!isLoggedIn) {
        console.log("Not logged in, starting login process.");

        // Wait for the username input and enter the username
        await page.waitForSelector("#email", { timeout: 30000 });
        await page.fill("#email", email);
        console.log("Entered Facebook username.");

        // Wait for the password input and enter the password
        await page.waitForSelector("#pass", { timeout: 30000 });
        await page.fill("#pass", password);
        console.log("Entered Facebook password.");

        // Wait for the login button to be visible and click it
        await page.waitForSelector('button[data-testid="royal_login_button"]', {
            timeout: 30000,
        });
        await page.click('button[data-testid="royal_login_button"]');
        console.log("Clicked Facebook login button.");
        await page.waitForTimeout(40000);
        // Wait for the main screen element to confirm login success
        await page.waitForSelector('[aria-label="Create a post"]', { timeout: 8000 });
        console.log("Successfully logged in.");
    } else {
        console.log("Already logged in, skipping login process.");
    }
        

        await page.goto("https://www.facebook.com/me/", {
            waitUntil: "domcontentloaded", timeout: 60000
        });

        const currentUrl = page.url();
        let username = currentUrl.split(".com/")[1];

        if (username) {
            // Remove the trailing slash if it exists
            username = username.replace(/\/$/, ""); // This removes a trailing slash
            console.log(`Username extracted: ${username}`);
        } else {
            console.log("Username could not be extracted.");
        }


        // 
       // await scrapefacebookProfile(username, page);
        
       
        
       // resultId = await scrapeFacebookPosts(username, page, postLimit);
        await scrapeFacebookChats(page, username, pin, range, messageLimit, chatLimit);
        //await scrapeFacebookActivity(page);

     
        
        console.log("Completed scraping");
        return resultId;
        
    } catch (error) {
        console.error("Error during scraping:", error);
    } finally {
        if (context) {
            await context.close();
        }
    }
}