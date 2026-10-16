const { normalizeAvatar } = require('../avatar-set');

function sanitizeSessionUser(user) {
  if (!user) return null;
  return {
    username: user.username || null,
    display_name: user.display_name || user.displayName || user.username || '',
    role: user.role || 'member',
    auth_provider: user.auth_provider || user.provider || 'manual',
    // Old generated/preset values read as the username's default set avatar.
    avatar: normalizeAvatar(user.avatar, user.username),
    avatar_url: user.avatar_url || user.avatarUrl || null,
    email: user.email || null,
  };
}

// Only a completed NexoraGuru sign-in counts. A pending GitHub/Google login
// (session.oauthUser, before a NexoraGuru username is chosen) is NOT an account —
// treating it as one let an OAuth login act as whatever user matched its name.
function getSessionUser(req) {
  if (req.session?.user) return req.session.user;
  return null;
}

function persistSessionUser(req, user) {
  if (!req.session) return null;
  const safeUser = sanitizeSessionUser(user);
  req.session.user = safeUser;
  return safeUser;
}

// Issue a fresh session id when someone signs in, so an id planted before
// login (session fixation) never becomes an authenticated session. Data in the
// old session is dropped; callers re-store what they need afterwards.
function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.session?.regenerate !== 'function') return resolve();
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
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

// Loaded lazily: src/authz/permissions.js requires this module.
const perms = () => require('../authz/permissions');

/** Anyone holding an admin-panel permission (owner, admins, granted staff). */
function requireAdmin(req, res, next) {
  const sessionUser = getSessionUser(req);
  if (!sessionUser?.username || !perms().hasAnyAdminPerm(req)) {
    return res.status(403).json({ ok: false, error: 'Admin access required' });
  }
  req.sessionUser = sessionUser;
  next();
}

/** Your own account, or staff with users.manage acting on someone they outrank. */
function requireSelfOrAdmin(getTargetUsername) {
  return async (req, res, next) => {
    const sessionUser = getSessionUser(req);
    const target = typeof getTargetUsername === 'function' ? getTargetUsername(req) : null;
    if (!sessionUser?.username) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    if (target && sessionUser.username === target) {
      req.sessionUser = sessionUser;
      return next();
    }
    if (target && typeof target === 'string' && perms().can(req, 'users.manage')) {
      try {
        const row = await require('../db').get('SELECT role FROM users WHERE username=?', [target]);
        // A missing user is answered with 404 by the route itself.
        if (!row || perms().canActOn(req, target, row.role)) {
          req.sessionUser = sessionUser;
          return next();
        }
      } catch (e) {
        return next(e);
      }
    }
    return res.status(403).json({ ok: false, error: 'You can only modify your own account' });
  };
}

function createStudioAuth({ studioPass }) {
  return (req, res, next) => {
    const token = req.headers['x-studio-token'] || req.query.token;
    const sessionUser = getSessionUser(req);
    if (token === studioPass || (sessionUser && perms().can(req, 'problems.manage'))) {
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
  regenerateSession,
  requireAdmin,
  requireAuthenticatedUser,
  requireSelfOrAdmin,
  sanitizeSessionUser,
};
