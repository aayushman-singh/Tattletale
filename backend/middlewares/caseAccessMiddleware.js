import asyncHandler from "express-async-handler";

const HANDLE_PATTERN = /^[A-Za-z0-9_-]+$/;

export const requireCaseScope = (scope) => asyncHandler(async (req, res, next) => {
  const { handle } = req.params;

  if (!handle || !HANDLE_PATTERN.test(handle)) {
    res.status(400);
    throw new Error("Invalid case handle.");
  }

  const grants = Array.isArray(req.user?.caseAccess) ? req.user.caseAccess : [];
  const hasScope = grants.some((grant) => (
    grant.handle === handle &&
    Array.isArray(grant.scopes) &&
    grant.scopes.includes(scope)
  ));

  if (!hasScope) {
    console.error("Missing required case scope.", {
      method: req.method,
      path: req.originalUrl,
      origin: req.get("origin"),
      ip: req.ip,
      userId: req.user?._id?.toString(),
      handle,
      requiredScope: scope,
      grantedScopesForHandle: grants
        .filter((grant) => grant.handle === handle && Array.isArray(grant.scopes))
        .flatMap((grant) => grant.scopes),
    });
    res.status(403);
    throw new Error("Missing required case scope.");
  }

  req.caseHandle = handle;
  req.caseScope = scope;
  next();
});
