export function randomDelay(min: number, max: number) {
    return new Promise((resolve) =>
        setTimeout(resolve, Math.random() * (max - min) + min)
    );
}

export interface ChatMessage {
    type: string;
    message: string;
    timestamp: string | null;
}