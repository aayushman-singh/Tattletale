import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import asyncHandler from "express-async-handler";

export const protect = asyncHandler(async (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    res.status(500);
    throw new Error("JWT_SECRET is not set. Copy .env.example to .env and set it.");
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error("Token validation error.", {
        method: req.method,
        path: req.originalUrl,
        origin: req.get("origin"),
        ip: req.ip,
        message: error.message,
        stack: error.stack,
      });
      res.status(401);
      throw new Error("Not authorized, token failed");
    }

    req.user = await User.findById(decoded.id).select("+caseAccess -password");
    if (!req.user) {
      console.error("No user found in database for token subject.", {
        method: req.method,
        path: req.originalUrl,
        origin: req.get("origin"),
        ip: req.ip,
        tokenSubject: decoded.id,
      });
      res.status(401);
      throw new Error("Not authorized, token failed");
    }

    next();
  } else {
    console.error("No token provided in request headers.", {
      method: req.method,
      path: req.originalUrl,
      origin: req.get("origin"),
      ip: req.ip,
    });
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }
});
