import mongoose, { Schema, Document, Model } from "mongoose";

interface IMessage {
    type: string;
    message: string;
    timestamp?: string | null;
    chatLogURL?: string;
}

interface IChat {
    receiverUsername: string;
    messages: IMessage[];
    screenshots: string[];
}

export interface IWhatsappUser extends Document {
    username: string;
    chats: IChat[];
    lastUpdated: Date;
    media: {
        media: string[];
        docs: string[];
        links: string[];
    };
    files: {
        media: string[];
        docs: string[];
        links: string[];
    };
}

const messageSchema = new Schema<IMessage>(
    {
        type: { type: String, required: true },
        message: { type: String, required: true },
        timestamp: { type: String },
        chatLogURL: { type: String },
    },
    { _id: false }
);

const chatSchema = new Schema<IChat>(
    {
        receiverUsername: { type: String, required: true },
        messages: [messageSchema],
        screenshots: [{ type: String, required: true }],
    },
    { _id: false }
);

const whatsappUserSchema = new Schema(
    {
        username: { type: String, required: true, unique: true, trim: true },
        chats: [chatSchema],
        lastUpdated: { type: Date, required: true },
        media: {
            media: { type: [String], default: [] },
            docs: { type: [String], default: [] },
            links: { type: [String], default: [] },
        },
        files: {
            media: { type: [String], default: [] },
            docs: { type: [String], default: [] },
            links: { type: [String], default: [] },
        },
    },
    {
        collection: "whatsapp_users",
        timestamps: true,
    }
);

const WhatsappUser: Model<IWhatsappUser> = mongoose.model<IWhatsappUser>("WhatsappUser", whatsappUserSchema);

export default WhatsappUser;
