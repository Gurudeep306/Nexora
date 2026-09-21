const express = require("express");
const { persistUpload } = require("../upload-store");

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
    requireAdmin,
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
  const ADMIN_USERS = ["gurudeep", "gurudeeppaidipati"];

  router.get("/api/auth/status", (req, res) => {
    const sessionUser = getSessionUser(req);
    if (sessionUser?.username) {
      return res.json({ ok: true, authenticated: true, user: sessionUser });
    }
    res.json({ ok: true, authenticated: false });
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
      const exists = await get("SELECT username FROM users WHERE username=?", [
        username,
      ]);
      res.json({ ok: true, available: !exists });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/api/user/register", async (req, res) => {
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

      const isAdmin = ADMIN_USERS.includes(clean.toLowerCase());
      const role = isAdmin ? "admin" : "member";
      const xpOverride = isAdmin ? 500000 : 0;
      const solvedOverride = isAdmin ? 5000 : 0;
      const existing = await get("SELECT * FROM users WHERE username=?", [
        clean,
      ]);

      if (existing) {
        await run(
          `UPDATE users SET display_name=?, avatar=?, bio=?, role=?, xp_override=?, solved_override=?,
            auth_provider=COALESCE(?,auth_provider), provider_id=COALESCE(?,provider_id),
            email=COALESCE(?,email), avatar_url=COALESCE(?,avatar_url) WHERE username=?`,
          [
            display_name || existing.display_name,
            avatar || existing.avatar,
            bio !== undefined ? bio : existing.bio,
            isAdmin ? "admin" : existing.role,
            isAdmin ? xpOverride : existing.xp_override,
            isAdmin ? solvedOverride : existing.solved_override,
            provider || null,
            provider_id || null,
            email || null,
            avatar_url || null,
            clean,
          ],
        );
        const user = await get("SELECT * FROM users WHERE username=?", [clean]);
        clearSessionUser(req);
        persistSessionUser(req, user);
        return res.json({ ok: true, user, updated: true });
      }

      let pwHash = null;
      if (password && typeof password === "string" && password.length >= 4) {
        pwHash = await hashPassword(password);
      }

      await run(
        `INSERT INTO users(username,display_name,avatar,bio,status,role,xp_override,solved_override,auth_provider,provider_id,email,avatar_url,password_hash,created_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          clean,
          display_name || clean,
          avatar || "coder",
          bio || "",
          "online",
          role,
          xpOverride,
          solvedOverride,
          provider || "manual",
          provider_id || null,
          email || null,
          avatar_url || null,
          pwHash,
          new Date().toISOString(),
        ],
      );

      const user = await get("SELECT * FROM users WHERE username=?", [clean]);
      clearSessionUser(req);
      persistSessionUser(req, user);
      res.json({ ok: true, user, created: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/api/user/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json({ ok: false, error: "Username and password required" });
      }
      const clean = username.replace(/[^a-zA-Z0-9_]/g, "");
      const user = await get("SELECT * FROM users WHERE username=?", [clean]);
      if (!user)
        return res.status(404).json({ ok: false, error: "User not found" });

      if (user.password_hash) {
        const valid = await verifyPassword(password, user.password_hash);
        if (!valid)
          return res
            .status(401)
            .json({ ok: false, error: "Incorrect password" });
      }

      persistSessionUser(req, user);
      res.json({ ok: true, user });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
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
          if (password.length < 4) {
            return res
              .status(400)
              .json({
                ok: false,
                error: "Password must be at least 4 characters",
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
          const taken = await get(
            "SELECT username FROM users WHERE username=?",
            [cleanNew],
          );
          if (taken)
            return res
              .status(400)
              .json({ ok: false, error: "Username already taken" });
          await run("UPDATE users SET username=? WHERE username=?", [
            cleanNew,
            currentUsername,
          ]);
          await run("UPDATE friendships SET from_user=? WHERE from_user=?", [
            cleanNew,
            currentUsername,
          ]);
          await run("UPDATE friendships SET to_user=? WHERE to_user=?", [
            cleanNew,
            currentUsername,
          ]);
          await run("UPDATE messages SET from_user=? WHERE from_user=?", [
            cleanNew,
            currentUsername,
          ]);
          await run("UPDATE messages SET to_user=? WHERE to_user=?", [
            cleanNew,
            currentUsername,
          ]);
          await run("UPDATE activity_feed SET username=? WHERE username=?", [
            cleanNew,
            currentUsername,
          ]).catch(() => {});
          finalUsername = cleanNew;
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
        persistSessionUser(req, updated);
        res.json({
          ok: true,
          user: updated,
          usernameChanged: finalUsername !== currentUsername,
        });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    },
  );

  router.post(
    "/api/user/avatar",
    requireAuthenticatedUser,
    requireSelfOrAdmin((req) => req.body.username),
    async (req, res) => {
      try {
        const { username, image } = req.body;
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
        await run("UPDATE users SET avatar_url=? WHERE username=?", [
          avatarUrl,
          username,
        ]);
        const updated = await get("SELECT * FROM users WHERE username=?", [
          username,
        ]);
        persistSessionUser(req, updated);
        res.json({ ok: true, avatar_url: avatarUrl });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
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
      res.status(500).json({ ok: false, error: e.message });
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
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/api/admin/set-role", requireAdmin, async (req, res) => {
    try {
      const { targetUser, role } = req.body;
      await run("UPDATE users SET role=? WHERE username=?", [role, targetUser]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const users = await deps.all(
        "SELECT username, display_name, avatar, bio, role, status, last_seen, created_at FROM users ORDER BY created_at DESC",
      );
      res.json({ ok: true, users });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}

module.exports = { createAuthRouter };
