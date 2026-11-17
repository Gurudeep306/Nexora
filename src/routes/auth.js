const express = require("express");
const rateLimit = require("express-rate-limit");
const { errMessage } = require("../http-error");
const { persistUpload } = require("../upload-store");
const { isSetAvatar, normalizeAvatar } = require("../avatar-set");
const { regenerateSession, sanitizeSessionUser } = require("../middleware/auth");
const { renameUserEverywhere } = require("../user-rename");
const { isOwnerName, mayEnterPrivateSite } = require("../authz/permissions");
const { getSettings, privateModeActive } = require("../authz/site-settings");
const { banPayload, loadUserAccess, privatePayload } = require("../authz/access");

// Columns that must never leave the server, whoever is asking.
const SECRET_USER_FIELDS = ["password_hash", "provider_id"];

/** A users row safe to return to the client. Email is only shown to its owner. */
function publicUserRow(user, { self = false } = {}) {
  if (!user) return null;
  const out = { ...user };
  for (const f of SECRET_USER_FIELDS) delete out[f];
  if (!self) delete out.email;
  return out;
}

function createAuthRouter(deps) {
  const {
    authLimiter,
    all,
    clearSessionUser,
    get,
    getAuthProviders,
    getSessionUser,
    hashPassword,
    persistSessionUser,
    requireAuthenticatedUser,
    requireSelfOrAdmin,
    run,
    verifyPassword,
    path,
    fs,
    calcLevel,
    calcStreak,
  } = deps;

  const router = express.Router();

  // Brute-force protection. These are separate from the shared authLimiter so
  // the debounced username-availability check can't use up a user's budget.
  // Login only counts failed attempts, so normal sign-ins are never blocked.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "Too many sign-in attempts — try again in a few minutes." },
  });
  const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "Too many sign-up attempts — try again later." },
  });

  // Usernames are unique case-insensitively ("GuruDeep" may not shadow
  // "gurudeep"). The PRIMARY KEY is case-sensitive, so check explicitly.
  const findUsernameNoCase = (name) =>
    get("SELECT username FROM users WHERE username = ? COLLATE NOCASE", [name]);

  // Hash compared against when the username doesn't exist, so an unknown user
  // and a wrong password take about the same time.
  let dummyHashPromise = null;
  const dummyHash = () => (dummyHashPromise ||= hashPassword("nexora-dummy-password"));
  const LOGIN_FAILED = "Incorrect username or password";

  router.get("/api/auth/status", (req, res) => {
    const sessionUser = getSessionUser(req);
    if (sessionUser?.username) {
      return res.json({ ok: true, authenticated: true, user: sessionUser });
    }
    // A GitHub/Google login waiting for the user to pick a NexoraGuru username.
    const o = req.session?.oauthUser;
    const oauthPending = o
      ? {
          provider: o.provider,
          displayName: o.displayName || "",
          email: o.email || "",
          suggestedUsername: String(o.username || o.displayName || "")
            .replace(/[^a-zA-Z0-9_]/g, "")
            .slice(0, 20),
        }
      : null;
    res.json({
      ok: true,
      authenticated: false,
      oauthPending,
      // Set when this session belonged to a banned account (just signed out).
      ...(req.accountBan ? { banned: banPayload(req.accountBan).ban } : {}),
    });
  });

  router.get("/api/auth/providers", (_req, res) => {
    res.json({ ok: true, ...getAuthProviders() });
  });

  router.post("/api/auth/logout", (req, res) => {
    clearSessionUser(req);
    req.session?.destroy((err) => {
      res.clearCookie("nx.sid");
      res.json({ ok: !err });
    });
  });

  router.get("/api/user/check-username", authLimiter, async (req, res) => {
    try {
      const username = (req.query.username || "").trim();
      if (!username || username.length < 2 || username.length > 20) {
        return res
          .status(400)
          .json({ ok: false, error: "Username must be 2-20 characters" });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res
          .status(400)
          .json({
            ok: false,
            error: "Username can only contain letters, numbers, underscores",
          });
      }
      const exists = await findUsernameNoCase(username);
      res.json({ ok: true, available: !exists });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post("/api/user/register", registerLimiter, async (req, res) => {
    try {
      const {
        username,
        display_name,
        avatar,
        bio,
        provider,
        provider_id,
        email,
        avatar_url,
        password,
      } = req.body;
      if (
        !username ||
        typeof username !== "string" ||
        username.length < 2 ||
        username.length > 20
      ) {
        return res
          .status(400)
          .json({ ok: false, error: "Username must be 2-20 characters" });
      }
      const clean = username.replace(/[^a-zA-Z0-9_]/g, "");
      if (clean !== username) {
        return res
          .status(400)
          .json({
            ok: false,
            error: "Username can only contain letters, numbers, underscores",
          });
      }

      // New accounts are members. Admin comes only from the stored role
      // (granted in the admin panel), never from the chosen name — except
      // the configured owner (OWNER_USERNAME), whose name is reserved.
      const role = isOwnerName(clean) ? "owner" : "member";
      const existing = await findUsernameNoCase(clean);

      // While the site is private (or sign-ups are closed) only the owner and
      // invited people (access_allowlist: username or email) may register.
      const site = await getSettings();
      const isPrivate = privateModeActive(site);
      let invited = false;
      if (!existing && role !== "owner" && (isPrivate || !site.registrations.open)) {
        // Only identities we can vouch for: the chosen username, and the email
        // GitHub/Google returned for this login. An email typed into the form
        // is unverified, so anyone knowing an invited address could claim it.
        const oauthEmail = req.session?.oauthUser?.email || null;
        const candidates = [clean, oauthEmail].filter((v) => typeof v === "string" && v);
        const hit = candidates.length
          ? await get(
              `SELECT entry FROM access_allowlist WHERE entry IN (${candidates.map(() => "?").join(",")}) COLLATE NOCASE LIMIT 1`,
              candidates,
            )
          : null;
        if (!hit) {
          return res.status(403).json(
            isPrivate
              ? { ok: false, code: "site_private", error: "NexoraGuru is invite-only right now" }
              : { ok: false, code: "registrations_closed", error: "Sign-ups are closed right now" },
          );
        }
        invited = true;
      }

      // Registering never touches an existing account (this used to overwrite
      // it and sign the caller in as that user — an account takeover).
      if (existing) {
        return res.status(409).json({ ok: false, error: "That username is already taken" });
      }

      // A pending GitHub/Google login supplies the verified identity; otherwise
      // a password is required.
      const oauth = req.session?.oauthUser || null;
      if (!oauth && (!password || typeof password !== "string" || password.length < 6)) {
        return res.status(400).json({ ok: false, error: "Password must be at least 6 characters" });
      }
      if (oauth) {
        const linked = await get("SELECT username FROM users WHERE auth_provider=? AND provider_id=?", [
          oauth.provider,
          String(oauth.providerId),
        ]);
        if (linked) {
          return res.status(409).json({ ok: false, error: `This ${oauth.provider} account is already linked to @${linked.username}` });
        }
      }

      let pwHash = null;
      if (password && typeof password === "string" && password.length >= 6) {
        pwHash = await hashPassword(password);
      }

      await run(
        `INSERT INTO users(username,display_name,avatar,bio,status,role,xp_override,solved_override,auth_provider,provider_id,email,avatar_url,password_hash,created_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          clean,
          display_name || clean,
          normalizeAvatar(avatar, clean),
          bio || "",
          "online",
          role,
          0,
          0,
          oauth ? oauth.provider : "manual",
          oauth ? String(oauth.providerId) : null,
          email || oauth?.email || null,
          oauth?.avatarUrl || null,
          pwHash,
          new Date().toISOString(),
        ],
      );

      if (invited) {
        // An invite comes with early access to the private site.
        await run(
          `INSERT OR IGNORE INTO user_permissions(username, perm, granted, granted_by, created_at)
           VALUES(?, 'early_access', 1, 'invite', ?)`,
          [clean, Date.now()],
        );
      }

      const user = await get("SELECT * FROM users WHERE username=?", [clean]);
      clearSessionUser(req);
      // New session id on sign-in (prevents session fixation).
      await regenerateSession(req);
      persistSessionUser(req, user);
      res.json({ ok: true, user: sanitizeSessionUser(user), created: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.post("/api/user/login", loginLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password || typeof username !== "string" || typeof password !== "string") {
        return res
          .status(400)
          .json({ ok: false, error: "Username and password required" });
      }
      const clean = username.replace(/[^a-zA-Z0-9_]/g, "");
      const user = await get("SELECT * FROM users WHERE username=?", [clean]);
      // Same answer (and roughly the same time) for an unknown user and a
      // wrong password, so the form can't be used to probe for accounts.
      if (!user) {
        await verifyPassword(password, await dummyHash()).catch(() => false);
        return res.status(401).json({ ok: false, error: LOGIN_FAILED });
      }

      // Accounts created through GitHub/Google have no password: never let
      // anyone in to them with an arbitrary password.
      if (!user.password_hash) {
        return res.status(400).json({
          ok: false,
          error: `This account signs in with ${user.auth_provider === "google" ? "Google" : "GitHub"} — use that button instead`,
        });
      }
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid)
        return res.status(401).json({ ok: false, error: LOGIN_FAILED });

      // Banned / suspended accounts, and everyone without access while the
      // site is private, are turned away after the password check (so the
      // answer reveals nothing to someone who doesn't know the password).
      const access = await loadUserAccess(user.username);
      if (access?.ban) return res.status(403).json(banPayload(access.ban));
      const site = await getSettings();
      if (privateModeActive(site) && !mayEnterPrivateSite(access)) {
        return res.status(403).json(privatePayload(site));
      }

      // Lazy migration: accounts from before the avatar set still hold an old
      // generated/preset value; store their default set avatar on sign-in.
      if (!isSetAvatar(user.avatar)) {
        user.avatar = normalizeAvatar(user.avatar, user.username);
        await run("UPDATE users SET avatar=? WHERE username=?", [user.avatar, user.username]).catch(() => {});
      }

      // New session id on sign-in (prevents session fixation).
      await regenerateSession(req);
      persistSessionUser(req, user);
      res.json({ ok: true, user: sanitizeSessionUser(user) });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.put(
    "/api/user/profile",
    requireAuthenticatedUser,
    requireSelfOrAdmin((req) => req.body.currentUsername),
    async (req, res) => {
      try {
        const {
          currentUsername,
          newUsername,
          displayName,
          bio,
          password,
          currentPassword,
          avatar,
          avatarUrl,
        } = req.body;
        if (!currentUsername)
          return res
            .status(400)
            .json({ ok: false, error: "Current username required" });

        const user = await get("SELECT * FROM users WHERE username=?", [
          currentUsername,
        ]);
        if (!user)
          return res.status(404).json({ ok: false, error: "User not found" });

        if (password && typeof password === "string") {
          if (password.length < 6) {
            return res
              .status(400)
              .json({
                ok: false,
                error: "Password must be at least 6 characters",
              });
          }
          if (user.password_hash) {
            if (!currentPassword) {
              return res
                .status(401)
                .json({ ok: false, error: "Current password is required" });
            }
            const valid = await verifyPassword(
              currentPassword,
              user.password_hash,
            );
            if (!valid) {
              return res
                .status(401)
                .json({ ok: false, error: "Current password is incorrect" });
            }
          }
          const newHash = await hashPassword(password);
          await run("UPDATE users SET password_hash=? WHERE username=?", [
            newHash,
            currentUsername,
          ]);
        }

        let finalUsername = currentUsername;
        if (newUsername && newUsername !== currentUsername) {
          const cleanNew = newUsername.replace(/[^a-zA-Z0-9_]/g, "");
          if (
            cleanNew !== newUsername ||
            cleanNew.length < 2 ||
            cleanNew.length > 20
          ) {
            return res
              .status(400)
              .json({ ok: false, error: "Invalid new username" });
          }
          // The owner's name is reserved: whoever holds it IS the owner
          // (effectiveRole), so nobody may rename onto it.
          if (isOwnerName(cleanNew) && !isOwnerName(currentUsername)) {
            return res.status(400).json({ ok: false, error: "That username is reserved" });
          }
          const taken = await findUsernameNoCase(cleanNew);
          // A case-only rename of your own account ("bob" -> "Bob") is fine.
          if (taken && taken.username !== currentUsername)
            return res
              .status(400)
              .json({ ok: false, error: "Username already taken" });
          await run("UPDATE users SET username=? WHERE username=?", [
            cleanNew,
            currentUsername,
          ]);
          // Every row that names the user moves with them (see src/user-rename.js),
          // so nothing is left for whoever registers the old name next.
          await renameUserEverywhere(currentUsername, cleanNew);
          finalUsername = cleanNew;
        }

        // Avatar: one of the avatar set ("set:<id>"); "" leaves it unchanged.
        if (avatar !== undefined && avatar !== "" && !isSetAvatar(avatar)) {
          return res.status(400).json({ ok: false, error: "Invalid avatar" });
        }
        if (
          displayName !== undefined ||
          bio !== undefined ||
          avatar ||
          avatarUrl !== undefined
        ) {
          const current = await get("SELECT * FROM users WHERE username=?", [
            finalUsername,
          ]);
          await run(
            "UPDATE users SET display_name=?, bio=?, avatar=?, avatar_url=? WHERE username=?",
            [
              displayName !== undefined ? displayName : current.display_name,
              bio !== undefined ? bio : current.bio,
              avatar || current.avatar,
              avatarUrl !== undefined ? avatarUrl || null : current.avatar_url,
              finalUsername,
            ],
          );
        }

        const updated = await get("SELECT * FROM users WHERE username=?", [
          finalUsername,
        ]);
        // Only switch the session when you edited your own account — an admin
        // editing someone else must stay signed in as themselves.
        const editingSelf = req.sessionUser?.username === currentUsername;
        if (editingSelf) persistSessionUser(req, updated);
        res.json({
          ok: true,
          user: publicUserRow(updated, { self: editingSelf }),
          usernameChanged: finalUsername !== currentUsername,
        });
      } catch (e) {
        res.status(500).json({ ok: false, error: errMessage(e) });
      }
    },
  );

  router.post(
    "/api/user/avatar",
    requireAuthenticatedUser,
    requireSelfOrAdmin((req) => req.body.username),
    async (req, res) => {
      try {
        // stage: store the photo and return its address without using it yet
        // (Edit profile and "Make it yours" save it with the rest of the form).
        const { username, image, stage } = req.body;
        if (!username || !image) {
          return res
            .status(400)
            .json({ ok: false, error: "Username and image required" });
        }
        const user = await get("SELECT * FROM users WHERE username=?", [
          username,
        ]);
        if (!user)
          return res.status(404).json({ ok: false, error: "User not found" });

        const match = image.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
        if (!match) {
          return res
            .status(400)
            .json({
              ok: false,
              error: "Invalid image format. Use PNG, JPG, or WebP.",
            });
        }
        const ext = match[1] === "jpeg" ? "jpg" : match[1];
        const data = Buffer.from(match[2], "base64");
        if (data.length > 2 * 1024 * 1024) {
          return res
            .status(400)
            .json({ ok: false, error: "Image too large (max 2MB)" });
        }

        const filename = `${username}_${Date.now()}.${ext}`;
        const uploadDir = path.join(__dirname, "..", "..", "public", "uploads");
        if (!fs.existsSync(uploadDir))
          fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, filename), data);

        const avatarUrl = `/uploads/${filename}`;
        await persistUpload(avatarUrl, path.join(uploadDir, filename));
        if (stage === true) return res.json({ ok: true, avatar_url: avatarUrl, staged: true });
        await run("UPDATE users SET avatar_url=? WHERE username=?", [
          avatarUrl,
          username,
        ]);
        const updated = await get("SELECT * FROM users WHERE username=?", [
          username,
        ]);
        if (req.sessionUser?.username === username) persistSessionUser(req, updated);
        res.json({ ok: true, avatar_url: avatarUrl });
      } catch (e) {
        res.status(500).json({ ok: false, error: errMessage(e) });
      }
    },
  );

  router.get("/api/user/search", async (req, res) => {
    try {
      const q = (req.query.q || "").trim();
      if (!q || q.length < 2) return res.json({ ok: true, users: [] });
      const users = await all(
        "SELECT username, display_name, avatar, avatar_url, role, status, last_seen FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 20",
        [`%${q}%`, `%${q}%`],
      );
      res.json({ ok: true, users });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  router.get("/api/user/profile/:username", async (req, res) => {
    try {
      const user = await get("SELECT * FROM users WHERE username=?", [
        req.params.username,
      ]);
      if (!user)
        return res.status(404).json({ ok: false, error: "User not found" });

      const baseSolved =
        (await get("SELECT COUNT(*) as c FROM progress WHERE username=? AND status='solved'", [user.username]))
          ?.c || 0;
      const baseXp =
        (await get("SELECT COALESCE(SUM(xp_earned),0) as s FROM progress WHERE username=?", [user.username]))
          ?.s || 0;
      const stats = {
        solved: baseSolved + (user.solved_override || 0),
        totalXp: baseXp + (user.xp_override || 0),
      };
      const level = calcLevel(stats.totalXp, stats.solved);
      const streak = await calcStreak(user.username);

      let friendStatus = "none";
      const viewer = req.query.viewer;
      if (viewer && viewer !== req.params.username) {
        const f = await get(
          `SELECT * FROM friendships WHERE
           (from_user=? AND to_user=?) OR (from_user=? AND to_user=?)`,
          [viewer, req.params.username, req.params.username, viewer],
        );
        if (f) {
          if (f.status === "accepted") friendStatus = "friends";
          else if (f.from_user === viewer) friendStatus = "pending_sent";
          else friendStatus = "pending_received";
        }
      }

      const friendCount =
        (
          await get(
            `SELECT COUNT(*) as c FROM friendships WHERE (from_user=? OR to_user=?) AND status='accepted'`,
            [req.params.username, req.params.username],
          )
        )?.c || 0;
      const activity = await all(
        `SELECT * FROM activity_feed WHERE username=? ORDER BY created_at DESC LIMIT 10`,
        [req.params.username],
      );
      const memberSince = user.created_at;

      res.json({
        ok: true,
        user: {
          ...user,
          email: undefined,
          provider_id: undefined,
          password_hash: undefined,
        },
        stats,
        level,
        streak: streak.current || 0,
        friendStatus,
        friendCount,
        activity,
        memberSince,
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: errMessage(e) });
    }
  });

  // Role changes and the user list live in src/routes/admin.js
  // (/api/admin/set-role and /api/admin/users keep working there).

  return router;
}

module.exports = { createAuthRouter };
