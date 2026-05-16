function sanitizeSessionUser(user) {
  if (!user) return null;
  return {
    username: user.username || null,
    display_name: user.display_name || user.displayName || user.username || '',
    role: user.role || 'member',
    auth_provider: user.auth_provider || user.provider || 'manual',
    avatar: user.avatar || 'coder',
    avatar_url: user.avatar_url || user.avatarUrl || null,
    email: user.email || null,
  };
}

function getSessionUser(req) {
  if (req.session?.user) return req.session.user;
  if (req.session?.oauthUser) return sanitizeSessionUser(req.session.oauthUser);
  return null;
}

function persistSessionUser(req, user) {
  if (!req.session) return null;
  const safeUser = sanitizeSessionUser(user);
  req.session.user = safeUser;
  return safeUser;
}

function clearSessionUser(req) {
  if (!req.session) return;
  delete req.session.user;
  delete req.session.oauthUser;
}

function requireAuthenticatedUser(req, res, next) {
  const sessionUser = getSessionUser(req);
  if (!sessionUser?.username) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }
  req.sessionUser = sessionUser;
  next();
}

function requireAdmin(req, res, next) {
  const sessionUser = getSessionUser(req);
  if (!sessionUser?.username || sessionUser.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Admin access required' });
  }
  req.sessionUser = sessionUser;
  next();
}

function requireSelfOrAdmin(getTargetUsername) {
  return (req, res, next) => {
    const sessionUser = getSessionUser(req);
    const target = typeof getTargetUsername === 'function' ? getTargetUsername(req) : null;
    if (!sessionUser?.username) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    if (sessionUser.role === 'admin' || (target && sessionUser.username === target)) {
      req.sessionUser = sessionUser;
      return next();
    }
    return res.status(403).json({ ok: false, error: 'You can only modify your own account' });
  };
}

function createStudioAuth({ studioPass }) {
  return (req, res, next) => {
    const token = req.headers['x-studio-token'] || req.query.token;
    const sessionUser = getSessionUser(req);
    if (token === studioPass || sessionUser?.role === 'admin') {
      req.sessionUser = sessionUser || null;
      return next();
    }
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  };
}

module.exports = {
  clearSessionUser,
  createStudioAuth,
  getSessionUser,
  persistSessionUser,
  requireAdmin,
  requireAuthenticatedUser,
  requireSelfOrAdmin,
  sanitizeSessionUser,
};
