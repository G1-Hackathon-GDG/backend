import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/generateToken.js";

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function getRefreshTokenFromRequest(req) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === "refreshToken") {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

function sendTokens(res, user, statusCode = 200) {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id, user.role);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(statusCode).json({
    accessToken,
    user: serializeUser(user),
  });
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name?.trim() || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "driver",
    });

    return sendTokens(res, user, 201);
  } catch (error) {
    console.error("Register error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error during registration." });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.role !== "driver") {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    return sendTokens(res, user);
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Server error during login." });
  }
}

export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !["admin", "staff"].includes(user.role)) {
      return res
        .status(401)
        .json({ message: "Invalid credentials or insufficient role." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    return sendTokens(res, user);
  } catch (error) {
    console.error("Admin login error:", error.message);
    return res.status(500).json({ message: "Server error during login." });
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(user);
  } catch (error) {
    console.error("GetMe error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
}

export async function refresh(req, res) {
  try {
    const token = getRefreshTokenFromRequest(req);

    if (!token) {
      return res
        .status(401)
        .json({ message: "No refresh token. Please log in." });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    return res.json({ accessToken });
  } catch (error) {
    console.error("Refresh error:", error.message);
    return res.status(401).json({
      message: "Invalid or expired refresh token. Please log in again.",
    });
  }
}

export function logout(req, res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.json({ message: "Logged out successfully." });
}
