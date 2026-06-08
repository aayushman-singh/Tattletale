// Builds a per-database MongoDB connection string from the MONGO_URI env var.
//
// MONGO_URI must be the cluster connection string WITHOUT a specific database,
// e.g. mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
//
// Fails loudly when unset — there is deliberately no fallback to a hardcoded
// cluster, so a missing config surfaces immediately instead of silently
// connecting to the wrong place.
export function mongoUri(database: string): string {
    const base = process.env.MONGO_URI;
    if (!base) {
        throw new Error(
            "MONGO_URI is not set. Copy .env.example to .env and set MONGO_URI " +
                "before starting a scraper route.",
        );
    }
    const [authority, query = "retryWrites=true&w=majority"] = base.split("?");
    const host = authority.replace(/\/+$/, "");
    return `${host}/${database}?${query}`;
}
