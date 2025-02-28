import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for a follower/following object
export interface IFollowerFollowing {
    id: string;
    username: string;
    profilePicUrl: string;
    fullName: string;
}

// Interface for a post object
export interface IPost {
    id: string;
    mediaType: number;
    imageUrl: string;
    timestamp: Date;
    likeCount: number;
    commentCount: number;
    accessibilityCaption: string;
}

// Interface for a chat message
export interface IChatMessage {
    index: number;
    type: string;
    content: string;
    date?: Date;
}

// Interface for a chat
export interface IChat {
    receiverUsername: string;
    messages: IChatMessage[];
    chatLogURL: string;
    lastUpdated: Date;
}

// Interface for login activity
export interface ILoginActivity {
    id: string;
    location: string;
    device: string;
    timestamp: Date;
    ipAddress: string;
    isCurrent: boolean;
}

// Interface for the Instagram user document
export interface IInstagramUser extends Document {
    username: string;
    profile: {
        instagramId: string;
        mediaCount: number;
        followingCount: number;
        followerCount: number;
        fullName: string;
        isPrivate: boolean;
        profilePicUrl: string;
    };
    posts: IPost[];
    followers: IFollowerFollowing[];
    following: IFollowerFollowing[];
    loginActivity: {
        sessions: ILoginActivity[];
        suspiciousLogins: ILoginActivity[];
    };
    chats: IChat[];
}
// Schema for follower/following objects
const followerFollowingSchema: Schema<IFollowerFollowing> = new Schema({
    id: { type: String, required: true },
    username: { type: String, required: true },
    profilePicUrl: { type: String, required: true },
    fullName: { type: String, required: true },
});

// Schema for post objects
const postSchema: Schema<IPost> = new Schema({
    id: { type: String, required: true },
    mediaType: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    timestamp: { type: Date, required: true },
    likeCount: { type: Number, required: true },
    commentCount: { type: Number, required: true },
    accessibilityCaption: { type: String, required: true },
});

// Schema for chat messages
const chatMessageSchema: Schema<IChatMessage> = new Schema({
    index: { type: Number, required: true },
    type: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: Date, required: false },
});

// Schema for chats
const chatSchema: Schema<IChat> = new Schema({
    receiverUsername: { type: String, required: true },
    messages: { type: [chatMessageSchema], required: true },
    chatLogURL: { type: String, required: true },
    lastUpdated: { type: Date, required: true },
});

// Schema for login activity
const loginActivitySchema: Schema<ILoginActivity> = new Schema({
    id: { type: String, required: true },
    location: { type: String, required: true },
    device: { type: String, required: true },
    timestamp: { type: Date, required: true },
    ipAddress: { type: String, required: true },
    isCurrent: { type: Boolean, required: true },
});

// Schema for Instagram users
const instagramUserSchema: Schema<IInstagramUser> = new Schema(
    {
        username: { type: String, required: true, unique: true, trim: true },
        profile: {
            instagramId: { type: String, required: true },
            mediaCount: { type: Number, required: true },
            followingCount: { type: Number, required: true },
            followerCount: { type: Number, required: true },
            fullName: { type: String, required: true },
            isPrivate: { type: Boolean, required: true },
            profilePicUrl: { type: String, required: true },
        },
        posts: { type: [postSchema], required: true },
        followers: { type: [followerFollowingSchema], required: true },
        following: { type: [followerFollowingSchema], required: true },
        loginActivity: {
            sessions: { type: [loginActivitySchema], required: true },
            suspiciousLogins: { type: [loginActivitySchema], required: true },
        },
        chats: { type: [chatSchema], required: true },
    },
    {
        collection: "instagram_users",
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Create the model for InstagramUser
const InstagramUser: Model<IInstagramUser> = mongoose.model<IInstagramUser>(
    "InstagramUser",
    instagramUserSchema
);

export default InstagramUser;