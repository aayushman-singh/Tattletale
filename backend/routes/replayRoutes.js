import express from "express";

import { getIntelBrief, getNetworkGraph } from "../controllers/replayArtifactControllers.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireCaseScope } from "../middlewares/caseAccessMiddleware.js";

const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store, private");
  res.set("Pragma", "no-cache");
  res.set("Surrogate-Control", "no-store");
  next();
});

router
  .route("/:handle/intel-brief")
  .get(protect, requireCaseScope("intel-brief:read"), getIntelBrief);

router
  .route("/:handle/network-graph")
  .get(protect, requireCaseScope("network-graph:read"), getNetworkGraph);

export default router;
