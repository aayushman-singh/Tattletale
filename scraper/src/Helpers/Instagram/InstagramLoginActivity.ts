import { Page } from "playwright";

export async function getLoginActivity(page: Page) {
    const apiUrl = "https://www.instagram.com/api/v1/session/login_activity/";
    console.log(`Navigating to: ${apiUrl}`);

    let loginActivityData: any = null;

    page.on("response", async (response) => {
        const url = response.url();

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
    await page.waitForTimeout(2000);

    if (!loginActivityData) {
        console.error("No login activity data was captured");
        return {};
    }

    if (loginActivityData.status !== "ok" || !loginActivityData.sessions) {
        console.error("Unexpected response structure", loginActivityData);
        return {};
    }

const convertToISO = (timestamp: number) => {
    if (timestamp > 9999999999) {
        timestamp = Math.floor(timestamp / 1000);
    }
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) {
        console.error("Invalid timestamp:", timestamp);
        return null;
    }
    return date.toISOString();
};

    const sessions = loginActivityData.sessions.map((session: any) => ({
        id: session.id,
        location: session.location,
        latitude: session.latitude,
        longitude: session.longitude,
        device: session.device,
        timestamp: convertToISO(session.timestamp), 
        login_timestamp: convertToISO(session.login_timestamp), 
        login_id: session.login_id,
        user_agent: session.user_agent,
        ip_address: session.ip_address,
        device_id: session.device_id,
        device_id_uuid: session.device_id_uuid,
        family_device_id: session.family_device_id,
        is_current: session.is_current,
    }));

    
    const suspicious_logins = loginActivityData.suspicious_logins
        ? loginActivityData.suspicious_logins.map((login: any) => ({
              id: login.id,
              location: login.location,
              latitude: login.latitude,
              longitude: login.longitude,
              device: login.device,
              timestamp: convertToISO(login.timestamp), 
              login_timestamp: login.login_timestamp, // null because failed login
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
