// Returns the MongoDB *cluster* connection string (no database in the path).
//
// Pair it with Mongoose's `{ dbName }` connect option so the driver selects the
// per-platform database — we deliberately do NOT hand-edit the URI string,
// which would mishandle existing db paths, auth sources, and query options.
//
// MONGO_CLUSTER_URI is distinct from the backend's MONGO_URI (which is a full
// application-database URI). The scraper opens many per-platform databases on
// one cluster, so it needs the cluster string without a fixed database.
//
//   Local:  mongodb://localhost:27017
//   Atlas:  mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority
//
// Fails loudly when unset — no silent fallback to a hardcoded cluster.
export function clusterUri(): string {
    const uri = process.env.MONGO_CLUSTER_URI;
    if (!uri) {
        throw new Error(
            "MONGO_CLUSTER_URI is not set. Copy .env.example to .env and set it " +
                "(the cluster string, e.g. mongodb://localhost:27017).",
        );
    }
    return uri;
}
