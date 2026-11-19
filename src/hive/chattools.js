// Tools for Hive chat: web search, reading pages, reading the project's code,
// the Drive, creating documents, and remembering things about the person.
// Any model that supports tool calls can use them; the chat shows each call.
const { run, all, get, newId, now } = require("./db");
const { readWebPage } = require("./plugins");
const docs = require("./docs");

const str = (description) => ({ type: "string", description });
const obj = (properties, required) => ({ type: "object", properties, required, additionalProperties: false });

const DEFS = {
  web_search: {
    description: "Search the web for current information (news, docs, prices, releases). Returns titles, links and snippets — then use read_url on the best results.",
    schema: obj({ query: str("Search query") }, ["query"]),
  },
  read_url: { description: "Read a public web page as text.", schema: obj({ url: str("https URL") }, ["url"]) },
  repo_search: {
    description: "Search the attached project's code (regex or text). Returns path:line matches.",
    schema: obj({ query: str("Regex or plain text"), glob: str("Optional glob such as src/**/*.ts") }, ["query"]),
  },
  repo_read: {
    description: "Read a file from the attached project's repository (numbered lines).",
    schema: obj({ path: str("File path"), offset: { type: "integer", description: "First line" }, limit: { type: "integer", description: "Lines (max 800)" } }, ["path"]),
  },
  drive_list: { description: "List files in Hive Drive (the team's file manager), optionally inside a folder.", schema: obj({ folder: str("Folder path, e.g. /docs") }, []) },
  drive_read: { description: "Read a text file from Hive Drive.", schema: obj({ path: str("Drive path, e.g. /docs/plan.md") }, ["path"]) },
  create_document: {
    description:
      "Create a downloadable document from Markdown: a PDF, Word file (docx), web page (html), Markdown file (md) or slide deck (slides — each '## heading' is a slide). Use this whenever the person asks for a document, report, PDF, resume, slides or anything they want to download or share. It is saved to Hive Drive too.",
    schema: obj(
      {
        title: str("Document title (also the file name)"),
        format: { type: "string", enum: ["pdf", "docx", "html", "md", "slides"], description: "File type" },
        markdown: str("The full document content in Markdown (headings, lists, tables, code blocks)"),
        folder: str("Drive folder to save into (default /documents)"),
      },
      ["title", "format", "markdown"],
    ),
  },
  remember: {
    description: "Save a lasting fact about the person you are talking to (preferences, role, projects, how they like answers) so every future chat knows it. Only for things they would want remembered.",
    schema: obj({ fact: str("One short sentence") }, ["fact"]),
  },
};

function toolsFor({ project = false, drive = true } = {}) {
  const names = ["web_search", "read_url", ...(project ? ["repo_search", "repo_read"] : []), ...(drive ? ["drive_list", "drive_read"] : []), "create_document", "remember"];
  return names.map((name) => ({ name, description: DEFS[name].description, schema: DEFS[name].schema }));
}

/* ── web search ─────────────────────────────────────────────────────── */
function decodeEntities(s) {
  return String(s)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Parse DuckDuckGo's HTML results page. */
function parseDuckDuckGo(html) {
  const cheerio = require("cheerio");
  const $ = cheerio.load(html);
  const out = [];
  $(".result").each((_, el) => {
    const a = $(el).find("a.result__a").first();
    let href = a.attr("href") || "";
    const m = href.match(/[?&]uddg=([^&]+)/);
    if (m) href = decodeURIComponent(m[1]);
    if (href.startsWith("//")) href = `https:${href}`;
    const title = decodeEntities(a.html() || "");
    const snippet = decodeEntities($(el).find(".result__snippet").first().html() || "");
    if (title && /^https?:\/\//.test(href) && !/duckduckgo\.com\/y\.js/.test(href)) out.push({ title, url: href, snippet });
  });
  return out.slice(0, 8);
}

async function webSearch(query) {
  const q = String(query).slice(0, 300);
  // Connected engines (Plugins → Connected tools: Tavily, Exa, Brave, SearXNG, Jina, Firecrawl) first.
  const viaEngine = await require("./toolbox").search(q).catch(() => null);
  if (viaEngine?.results?.length) return viaEngine.results;
  if (process.env.BRAVE_API_KEY) {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8`, { headers: { "X-Subscription-Token": process.env.BRAVE_API_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Search failed (Brave ${res.status})`);
    const j = await res.json();
    return (j.web?.results || []).slice(0, 8).map((r) => ({ title: decodeEntities(r.title), url: r.url, snippet: decodeEntities(r.description || "") }));
  }
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", Accept: "text/html" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  return parseDuckDuckGo(await res.text());
}

/* ── execute ────────────────────────────────────────────────────────── */
const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}\n… [${s.length - n} more characters]` : s);

/**
 * ctx: { username, projectRepo: () => Promise<{ snap, readBase } | null>,
 *        drive, saveFile(name, mime, buffer) → file, convoId }
 * Returns { content, isError, file? }.
 */
async function execute(name, input, ctx) {
  try {
    if (name.startsWith("mcp_")) return await require("./toolbox").callMcpTool(name, input);
    switch (name) {
      case "web_search": {
        const r = await webSearch(input.query);
        if (!r.length) return { content: "No results." };
        return { content: r.map((x, i) => `${i + 1}. ${x.title}\n   ${x.url}\n   ${x.snippet}`).join("\n"), meta: { results: r.slice(0, 6) } };
      }
      case "read_url": {
        const r = (await require("./toolbox").readPage(input.url).catch(() => null)) || (await readWebPage(input.url));
        return { content: clip(r.text || "", 40_000), meta: { url: input.url, via: r.via || null } };
      }
      case "repo_search":
      case "repo_read": {
        const repo = ctx.projectRepo ? await ctx.projectRepo() : null;
        if (!repo) return { content: "No project is attached to this chat.", isError: true };
        const { snap, readBase } = repo;
        await snap.contentReady?.catch?.(() => {});
        if (name === "repo_read") {
          const text = await readBase(snap, String(input.path).replace(/^\/+/, ""));
          if (text == null) return { content: `${input.path} not found.`, isError: true };
          const lines = text.split("\n");
          const off = Math.max(1, input.offset || 1);
          const lim = Math.min(800, Math.max(1, input.limit || 400));
          const body = lines.slice(off - 1, off - 1 + lim).map((l, i) => `${off + i}│${l}`).join("\n");
          return { content: clip(body + (off - 1 + lim < lines.length ? `\n… ${lines.length - (off - 1 + lim)} more lines` : ""), 60_000), meta: { path: input.path } };
        }
        let re;
        try {
          re = new RegExp(input.query, "i");
        } catch {
          re = new RegExp(String(input.query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        }
        const { globToRegex } = require("./workspace");
        const g = input.glob ? globToRegex(input.glob) : null;
        const hits = [];
        for (const [p, buf] of snap.files) {
          if (g && !g.test(p)) continue;
          const lines = buf.toString("utf8").split("\n");
          for (let i = 0; i < lines.length && hits.length < 60; i++) if (re.test(lines[i])) hits.push(`${p}:${i + 1}: ${lines[i].slice(0, 220)}`);
          if (hits.length >= 60) break;
        }
        return { content: hits.length ? hits.join("\n") : "No matches.", meta: { count: hits.length } };
      }
      case "drive_list": {
        if (!ctx.drive) return { content: "Drive is not available.", isError: true };
        const items = await ctx.drive.list({ folder: input.folder || "/", projectId: ctx.projectId || null });
        return { content: items.length ? items.map((f) => `${f.kind === "folder" ? "📁" : "📄"} ${f.path}${f.kind === "file" ? ` (${f.mime}, ${Math.ceil(f.size / 1024)} KB)` : ""}`).join("\n") : "Empty." };
      }
      case "drive_read": {
        if (!ctx.drive) return { content: "Drive is not available.", isError: true };
        const f = await ctx.drive.readText({ path: input.path, projectId: ctx.projectId || null });
        if (f == null) return { content: `${input.path} is not a readable text file in Drive.`, isError: true };
        return { content: clip(f, 60_000), meta: { path: input.path } };
      }
      case "create_document": {
        const r = await docs.render(String(input.markdown || ""), { format: input.format, title: input.title || "Document", subtitle: `Created in Nexora Hive · ${new Date().toISOString().slice(0, 10)}` });
        const file = await ctx.saveFile(r.name, r.mime, r.buffer, input.folder || "/documents");
        return { content: `Created ${r.name} (${Math.ceil(r.buffer.length / 1024)} KB). It is attached to your reply and saved in Drive.${r.note ? ` Note: ${r.note}` : ""}`, file, meta: { name: r.name } };
      }
      case "remember": {
        const fact = String(input.fact || "").trim().slice(0, 400);
        if (!fact) return { content: "Nothing to remember.", isError: true };
        const n = await get("SELECT COUNT(*) AS n FROM hive_user_memory WHERE username=?", [ctx.username]);
        if (Number(n?.n) >= 200) return { content: "Memory is full (200 facts) — ask the person to tidy it in Hive → Memory → About you.", isError: true };
        const r = await require("./memory").rememberPerson(ctx.username, fact, "chat");
        return { content: r.updated ? "Already in their memory." : "Saved to their memory." };
      }
      default:
        return { content: `Unknown tool ${name}`, isError: true };
    }
  } catch (e) {
    return { content: `Tool failed: ${e.message}`, isError: true };
  }
}

/** What a chat should know about the person (their saved facts). */
async function userMemory(username) {
  const rows = await all("SELECT fact FROM hive_user_memory WHERE username=? ORDER BY created_at DESC LIMIT 60", [username]);
  return rows.map((r) => r.fact);
}

module.exports = { DEFS, toolsFor, execute, webSearch, parseDuckDuckGo, userMemory };
