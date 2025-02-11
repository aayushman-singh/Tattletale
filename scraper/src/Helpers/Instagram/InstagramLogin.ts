import { Page } from "playwright";

export async function getLoginActivity(page: Page) {
    const apiUrl = "https://www.instagram.com/api/v1/session/login_activity/";
    console.log(`Navigating to: ${apiUrl}`);

    // Variable to store the login activity data once captured.
    let loginActivityData: any = null;

    // Listen for all responses.
    page.on("response", async (response) => {
        const url = response.url();
        // Check if the response URL matches the API URL.
        if (url.includes(apiUrl)) {
            console.log(`🟢 API Response detected: ${url}`);
            try {
                const data = await response.json();
                console.log(
                    "📥 Raw API Response:",
                    JSON.stringify(data, null, 2)
                );
                loginActivityData = data;
            } catch (error) {
                console.error("❌ Error processing API response:", error);
            }
        }
    });

    await page.goto("https://www.instagram.com/session/login_activity/");
    // Optionally, wait a bit more for all responses to be captured.
    await page.waitForTimeout(2000);

    if (!loginActivityData) {
        console.error("No login activity data was captured");
        return {};
    }

    if (loginActivityData.status !== "ok" || !loginActivityData.sessions) {
        console.error("Unexpected response structure", loginActivityData);
        return {};
    }

    // Extract all details from each session.
    const sessions = loginActivityData.sessions.map((session: any) => ({
        id: session.id,
        location: session.location,
        latitude: session.latitude,
        longitude: session.longitude,
        device: session.device,
        timestamp: session.timestamp,
        login_timestamp: session.login_timestamp,
        login_id: session.login_id,
        user_agent: session.user_agent,
        ip_address: session.ip_address,
        device_id: session.device_id,
        device_id_uuid: session.device_id_uuid,
        family_device_id: session.family_device_id,
        is_current: session.is_current,
    }));

    // Extract all details from suspicious logins if available.
    const suspicious_logins = loginActivityData.suspicious_logins
        ? loginActivityData.suspicious_logins.map((login: any) => ({
              id: login.id,
              location: login.location,
              latitude: login.latitude,
              longitude: login.longitude,
              device: login.device,
              timestamp: login.timestamp,
              login_timestamp: login.login_timestamp,
              login_id: login.login_id,
              user_agent: login.user_agent,
              ip_address: login.ip_address,
              device_id: login.device_id,
              device_id_uuid: login.device_id_uuid,
              family_device_id: login.family_device_id,
          }))
        : [];

    console.log(
        `Parsed ${sessions.length} sessions and ${suspicious_logins.length} suspicious logins.`
    );
    return {
        sessions,
        suspicious_logins,
    };
}
