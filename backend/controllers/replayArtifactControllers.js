import asyncHandler from "express-async-handler";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_REPORT_BYTES = 10 * 1024 * 1024;
const MAX_NOTICE_CHARS = 512;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function artifactRoot(context = {}) {
  const root = process.env.REPLAY_ARTIFACT_DIR;
  if (!root) {
    throw httpError("Replay artifact directory is not configured.", 503, { step: "load-artifact-root" });
  }
  context.configuredArtifactRoot = path.resolve(root);
  return root;
}

function httpError(message, statusCode, details = {}) {
  return Object.assign(new Error(message), { statusCode, ...details });
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(`Replay artifact is missing ${label}.`, 500, { step: `validate-${label}` });
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw httpError(`Replay artifact has invalid ${label}.`, 500, { step: `validate-${label}` });
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw httpError(`Replay artifact has invalid ${label}.`, 500, { step: `validate-${label}` });
  }
}

function assertNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw httpError(`Replay artifact has invalid ${label}.`, 500, { step: `validate-${label}` });
  }
}

function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw httpError(`Replay artifact has invalid ${label}.`, 500, { step: `validate-${label}` });
  }
}

function assertIsoInstant(value, label) {
  assertString(value, label);
  if (!ISO_INSTANT.test(value) || Number.isNaN(Date.parse(value))) {
    throw httpError(`Replay artifact has invalid ${label}.`, 500, { step: `validate-${label}` });
  }
}

function assertExactKeys(value, keys, label) {
  assertObject(value, label);
  const allowed = new Set(keys);
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw httpError(`Replay artifact has unexpected ${label} fields: ${unexpected.join(", ")}.`, 500, {
      step: `validate-${label}`,
    });
  }
}

function isInside(parentPath, childPath) {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function missingArtifact(handle) {
  return httpError(`Replay artifact for subject "${handle}" was not found.`, 404, { step: "load-report-path" });
}

function isMissingPath(error) {
  return error?.code === "ENOENT" || error?.code === "ENOTDIR";
}

function sameFileIdentity(expected, actual) {
  return (
    Number.isFinite(expected?.dev) &&
    Number.isFinite(expected?.ino) &&
    Number.isFinite(actual?.dev) &&
    Number.isFinite(actual?.ino) &&
    expected.dev === actual.dev &&
    expected.ino === actual.ino
  );
}

function assertRegularReportStat(stat, handle) {
  if (!stat.isFile()) {
    throw httpError(`Replay artifact for subject "${handle}" is not a regular file.`, 500, {
      step: "validate-report-stat",
    });
  }
  if (stat.size > MAX_REPORT_BYTES) {
    throw httpError("Replay artifact exceeds maximum size.", 413, { step: "validate-report-size" });
  }
}

export async function resolveReportPath(root, handle, fsOps = fs, context = {}) {
  const rootPath = path.resolve(root);
  const requestedDir = path.resolve(rootPath, handle);
  context.artifactRoot = rootPath;
  context.requestedArtifactDir = requestedDir;

  if (!isInside(rootPath, requestedDir)) {
    throw httpError("Replay artifact path escaped its root.", 400, { step: "validate-requested-dir" });
  }

  let rootRealPath;
  try {
    rootRealPath = await fsOps.realpath(rootPath);
  } catch (error) {
    if (isMissingPath(error)) {
      throw httpError("Replay artifact directory is not available.", 503, { step: "realpath-artifact-root" });
    }
    throw error;
  }
  context.artifactRootRealPath = rootRealPath;

  let artifactRealDir;
  try {
    artifactRealDir = await fsOps.realpath(requestedDir);
  } catch (error) {
    if (isMissingPath(error)) {
      throw missingArtifact(handle);
    }
    throw error;
  }
  context.artifactRealDir = artifactRealDir;

  if (!isInside(rootRealPath, artifactRealDir)) {
    throw httpError("Replay artifact path escaped its root.", 400, { step: "validate-artifact-dir-realpath" });
  }

  const reportPath = path.join(artifactRealDir, "report.json");
  context.reportPath = reportPath;
  let linkStat;
  try {
    linkStat = await fsOps.lstat(reportPath);
  } catch (error) {
    if (isMissingPath(error)) {
      throw missingArtifact(handle);
    }
    throw error;
  }
  if (linkStat.isSymbolicLink()) {
    throw httpError("Replay artifact path escaped its root.", 400, { step: "validate-report-lstat" });
  }

  let reportRealPath;
  try {
    reportRealPath = await fsOps.realpath(reportPath);
  } catch (error) {
    if (isMissingPath(error)) {
      throw missingArtifact(handle);
    }
    throw error;
  }
  context.reportRealPath = reportRealPath;

  if (!isInside(rootRealPath, reportRealPath)) {
    throw httpError("Replay artifact path escaped its root.", 400, { step: "validate-report-realpath" });
  }

  const reportStat = await fsOps.stat(reportRealPath);
  assertRegularReportStat(reportStat, handle);

  return { reportRealPath, reportStat };
}

export async function openValidatedReportFile(root, handle, fsOps = fs, context = {}) {
  const { reportRealPath, reportStat } = await resolveReportPath(root, handle, fsOps, context);
  let file;
  try {
    file = await fsOps.open(reportRealPath, "r");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw missingArtifact(handle);
    }
    throw error;
  }

  try {
    const stat = await file.stat();
    assertRegularReportStat(stat, handle);
    if (!sameFileIdentity(reportStat, stat)) {
      throw httpError("Replay artifact changed during validation.", 409, { step: "validate-opened-report" });
    }
    return file;
  } catch (error) {
    await file.close();
    throw error;
  }
}

async function readReportFile(file, handle) {
  try {
    const stat = await file.stat();
    assertRegularReportStat(stat, handle);
    return await file.readFile("utf8");
  } finally {
    await file.close();
  }
}

async function loadReport(handle, context = {}) {
  const root = artifactRoot(context);
  const file = await openValidatedReportFile(root, handle, fs, context);
  const raw = await readReportFile(file, handle);

  let report;
  try {
    report = JSON.parse(raw);
  } catch (error) {
    throw httpError(`Replay artifact for subject "${handle}" is not valid JSON.`, 500, {
      step: "parse-report-json",
      causeMessage: error.message,
      causeStack: error.stack,
    });
  }
  if (report.handle !== handle) {
    throw httpError(`Replay artifact subject mismatch for "${handle}".`, 409, { step: "validate-report-handle" });
  }
  return report;
}

function reportHeaderProjection(report, { includeSynthetic = false, includeNotice = false } = {}) {
  assertString(report.handle, "handle");
  assertIsoInstant(report.generatedAt, "generatedAt");

  const header = {
    handle: report.handle,
    generatedAt: report.generatedAt,
  };

  if (includeSynthetic) {
    assertBoolean(report.synthetic, "synthetic");
    header.synthetic = report.synthetic;
  }

  if (includeNotice && report.notice !== undefined) {
    assertString(report.notice, "notice");
    if (report.notice.length > MAX_NOTICE_CHARS) {
      throw httpError("Replay artifact has invalid notice.", 500, { step: "validate-notice" });
    }
    header.notice = report.notice;
  }

  return header;
}

function intelBriefProjection(report) {
  const header = reportHeaderProjection(report, { includeSynthetic: true, includeNotice: true });
  assertObject(report.brief, "brief");
  assertString(report.brief.text, "brief.text");
  assertString(report.brief.generator, "brief.generator");
  if (report.brief.validated !== true) {
    throw httpError("Replay artifact brief is not validated.", 500);
  }

  return {
    ...header,
    brief: {
      text: report.brief.text,
      generator: report.brief.generator,
      validated: report.brief.validated,
    },
  };
}

function networkGraphProjection(report) {
  const header = reportHeaderProjection(report);
  assertExactKeys(report.network, ["nodes", "links", "timeRange", "contactCount", "crossPlatformContacts"], "network");
  assertArray(report.network.nodes, "network.nodes");
  assertArray(report.network.links, "network.links");
  assertExactKeys(report.network.timeRange, ["startMs", "endMs"], "network.timeRange");
  assertNumber(report.network.timeRange.startMs, "network.timeRange.startMs");
  assertNumber(report.network.timeRange.endMs, "network.timeRange.endMs");
  assertNumber(report.network.contactCount, "network.contactCount");
  assertNumber(report.network.crossPlatformContacts, "network.crossPlatformContacts");

  const nodes = report.network.nodes.map((node, index) => {
    assertExactKeys(node, ["id", "kind", "label", "platform", "cluster", "crossPlatform", "degree", "x", "y"], `network.nodes[${index}]`);
    assertString(node.id, `network.nodes[${index}].id`);
    assertString(node.kind, `network.nodes[${index}].kind`);
    if (!["self", "contact"].includes(node.kind)) {
      throw httpError(`Replay artifact has invalid network.nodes[${index}].kind.`, 500);
    }
    assertString(node.label, `network.nodes[${index}].label`);
    assertString(node.platform, `network.nodes[${index}].platform`);
    assertNumber(node.cluster, `network.nodes[${index}].cluster`);
    assertBoolean(node.crossPlatform, `network.nodes[${index}].crossPlatform`);
    assertNumber(node.degree, `network.nodes[${index}].degree`);
    assertNumber(node.x, `network.nodes[${index}].x`);
    assertNumber(node.y, `network.nodes[${index}].y`);
    return {
      id: node.id,
      kind: node.kind,
      label: node.label,
      platform: node.platform,
      cluster: node.cluster,
      crossPlatform: node.crossPlatform,
      degree: node.degree,
      x: node.x,
      y: node.y,
    };
  });

  const links = report.network.links.map((link, index) => {
    assertExactKeys(link, ["source", "target", "type", "timestamp", "t"], `network.links[${index}]`);
    assertString(link.source, `network.links[${index}].source`);
    assertString(link.target, `network.links[${index}].target`);
    assertString(link.type, `network.links[${index}].type`);
    assertString(link.timestamp, `network.links[${index}].timestamp`);
    assertNumber(link.t, `network.links[${index}].t`);
    return {
      source: link.source,
      target: link.target,
      type: link.type,
      timestamp: link.timestamp,
      t: link.t,
    };
  });

  return {
    handle: header.handle,
    generatedAt: header.generatedAt,
    network: {
      nodes,
      links,
      timeRange: {
        startMs: report.network.timeRange.startMs,
        endMs: report.network.timeRange.endMs,
      },
      contactCount: report.network.contactCount,
      crossPlatformContacts: report.network.crossPlatformContacts,
    },
  };
}

function requestLogContext(req, projection) {
  return {
    handle: req.caseHandle,
    projection,
    userId: req.user?._id?.toString(),
    requiredScope: req.caseScope,
    origin: req.get("origin"),
    ip: req.ip,
  };
}

function sendError(res, error, context) {
  const status = error.statusCode || 500;
  console.error("Replay artifact request failed.", {
    ...context,
    step: error.step,
    status,
    message: error.message,
    causeMessage: error.causeMessage,
    causeStack: error.causeStack,
    stack: error.stack,
  });
  res.status(status);
  throw error;
}

export const getIntelBrief = asyncHandler(async (req, res) => {
  const artifactContext = {};
  try {
    const report = await loadReport(req.caseHandle, artifactContext);
    res.json(intelBriefProjection(report));
  } catch (error) {
    sendError(res, error, { ...requestLogContext(req, "intel-brief"), ...artifactContext });
  }
});

export const getNetworkGraph = asyncHandler(async (req, res) => {
  const artifactContext = {};
  try {
    const report = await loadReport(req.caseHandle, artifactContext);
    res.json(networkGraphProjection(report));
  } catch (error) {
    sendError(res, error, { ...requestLogContext(req, "network-graph"), ...artifactContext });
  }
});
