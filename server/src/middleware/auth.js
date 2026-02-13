const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "salon15admin";

/**
 * Lihtne tokeni-põhine autentimise vahevara admin-päringutele.
 * Ootab päises: Authorization: Bearer <token>
 */
function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Autentimine nõutud." });
  }

  const token = header.slice(7);
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "Keelatud." });
  }

  next();
}

module.exports = { requireAdmin, ADMIN_TOKEN };
