export function staffOrAdmin(req, res, next) {
  if (!req.user || !["staff", "admin"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: "Access denied. Station staff or admin only." });
  }
  next();
}
