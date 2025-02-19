export function randomDelay(min: number, max: number) {
    return new Promise((resolve) =>
        setTimeout(resolve, Math.random() * (max - min) + min)
    );
}

export interface ChatMessage {
    direction: "incoming" | "outgoing" | "unknown" | "system";
    type: "text" | "date" | "emoji" | "reply" | "media" | "image";
    message: string;
    timestamp: string | null;
}