import jwt from "jsonwebtoken";

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function generateToken(userId, role, options = {}) {
  return jwt.sign(
    { userId: userId.toString(), role },
    options.secret ?? getRequiredEnv("JWT_SECRET"),
    { expiresIn: options.expiresIn ?? process.env.JWT_EXPIRES_IN ?? "15m" },
  );
}

export function generateAccessToken(userId, role) {
  return generateToken(userId, role);
}

export function generateRefreshToken(userId, role) {
  return jwt.sign(
    { userId: userId.toString(), role },
    getRequiredEnv("JWT_REFRESH_SECRET"),
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d" },
  );
}

export function verifyToken(token, options = {}) {
  return jwt.verify(token, options.secret ?? getRequiredEnv("JWT_SECRET"));
}

export function verifyAccessToken(token) {
  return verifyToken(token);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, getRequiredEnv("JWT_REFRESH_SECRET"));
}
