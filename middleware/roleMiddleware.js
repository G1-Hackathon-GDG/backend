export function allowRoles(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied for this role." });
    }

    return next();
  };
}

