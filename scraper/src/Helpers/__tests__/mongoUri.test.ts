// Run with: npm test  (uses Node's built-in test runner via tsx, no extra deps)
import { test } from "node:test";
import assert from "node:assert/strict";
import { clusterUri } from "../mongoUri.js";

function withEnv(value: string | undefined, fn: () => void) {
    const prev = process.env.MONGO_CLUSTER_URI;
    if (value === undefined) delete process.env.MONGO_CLUSTER_URI;
    else process.env.MONGO_CLUSTER_URI = value;
    try {
        fn();
    } finally {
        if (prev === undefined) delete process.env.MONGO_CLUSTER_URI;
        else process.env.MONGO_CLUSTER_URI = prev;
    }
}

test("throws loudly when MONGO_CLUSTER_URI is unset", () => {
    withEnv(undefined, () => {
        assert.throws(() => clusterUri(), /MONGO_CLUSTER_URI is not set/);
    });
});

test("throws when MONGO_CLUSTER_URI is empty", () => {
    withEnv("", () => {
        assert.throws(() => clusterUri(), /MONGO_CLUSTER_URI is not set/);
    });
});

test("returns a local cluster URI unchanged (db selected via dbName option)", () => {
    withEnv("mongodb://localhost:27017", () => {
        assert.equal(clusterUri(), "mongodb://localhost:27017");
    });
});

test("returns an Atlas URI with query options unchanged", () => {
    const atlas =
        "mongodb+srv://u:p@cluster0.example.mongodb.net/?retryWrites=true&w=majority";
    withEnv(atlas, () => {
        assert.equal(clusterUri(), atlas);
    });
});

test("does not mangle a URI that already carries a database path", () => {
    const withDb = "mongodb://localhost:27017/somedb?authSource=admin";
    withEnv(withDb, () => {
        assert.equal(clusterUri(), withDb);
    });
});
