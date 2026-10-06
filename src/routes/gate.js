const express = require("express");
const fs = require("fs");
const path = require("path");

/*
 * GATE CSE / IT / DA past-year questions.
 *
 * Every paper in GATE_PYQ was transcribed question by question into
 * src/gate/questions.json (text, options, figures, subject, topic, answer).
 * This router serves the bank: a filtered, searchable list and one question
 * at a time. Everything is held in memory — the file is a few megabytes and
 * never changes at run time.
 */

const FILE = path.join(__dirname, "..", "gate", "questions.json");

let bank = null;
let lastMtime = 0;

function load() {
  try {
    const mtime = fs.statSync(FILE).mtimeMs;
    if (bank && mtime === lastMtime) return bank;
    lastMtime = mtime;
  } catch (_) {}
  if (bank && lastMtime !== 0) return bank;
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const questions = raw.questions.map((q) => ({
    ...q,
    // One lower-cased haystack per question so search is a single scan.
    _hay: [
      q.text,
      q.id,
      q.number,
      q.solution,
      ...(q.options || []).map((o) => o.t),
      ...(q.tags || []),
      ...(q.figures || []).map((f) => f.alt),
    ]
      .join(" \u0000 ")
      .toLowerCase(),
  }));
  bank = { ...raw, questions, byId: new Map(questions.map((q) => [q.id, q])) };
  return bank;
}

/** Quoted phrases stay together; everything else is an AND term. */
function terms(q) {
  const out = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(q))) {
    const t = (m[1] || m[2]).toLowerCase().trim();
    if (t) out.push(t);
  }
  return out.slice(0, 8);
}

function strip(q) {
  const { _hay, ...rest } = q;
  return rest;
}

const asList = (v) =>
  String(v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function createGateRouter() {
  const router = express.Router();

  /* Papers, subjects and counts — everything the filter UI needs. */
  router.get("/api/gate/meta", (req, res) => {
    const b = load();
    const bySubject = {};
    const byYear = {};
    const byType = {};
    for (const q of b.questions) {
      const key = `${q.exam === "DA" ? "DA" : "CSE"}:${q.subject}`;
      bySubject[key] = (bySubject[key] || 0) + 1;
      byYear[q.year] = (byYear[q.year] || 0) + 1;
      byType[q.type] = (byType[q.type] || 0) + 1;
    }
    res.json({
      ok: true,
      generated: b.generated,
      total: b.questions.length,
      papers: b.papers,
      subjects: b.subjects,
      counts: { bySubject, byYear, byType },
    });
  });

  /* The searchable, filterable list. */
  router.get("/api/gate/questions", (req, res) => {
    const b = load();
    const {
      q = "",
      exam = "",
      year = "",
      minYear = "",
      maxYear = "",
      paper = "",
      subject = "",
      topic = "",
      type = "",
      section = "",
      marks = "",
      answered = "",
      hasFigure = "",
      sort = "year-desc",
    } = req.query;

    const exams = asList(exam);
    const years = asList(year).map(Number);
    const papersF = asList(paper);
    const subjects = asList(subject);
    const topics = asList(topic);
    const types = asList(type);
    const sections = asList(section);
    const marksF = asList(marks).map(Number);
    const words = terms(String(q));

    let rows = b.questions.filter((x) => {
      if (exams.length && !exams.includes(x.exam)) return false;
      if (years.length && !years.includes(x.year)) return false;
      if (minYear && x.year < Number(minYear)) return false;
      if (maxYear && x.year > Number(maxYear)) return false;
      if (papersF.length && !papersF.includes(x.paper)) return false;
      if (subjects.length && !subjects.includes(x.subject)) return false;
      if (topics.length && !topics.includes(`${x.subject}/${x.topic}`) && !topics.includes(x.topic)) return false;
      if (types.length && !types.includes(x.type)) return false;
      if (sections.length) {
        const ga = x.section === "ga";
        if (!sections.some((s) => (s === "ga" ? ga : !ga))) return false;
      }
      if (marksF.length && !marksF.includes(Number(x.marks))) return false;
      if (answered === "yes" && (x.answer === null || x.answer === undefined)) return false;
      if (answered === "no" && x.answer !== null && x.answer !== undefined) return false;
      if (hasFigure === "yes" && (!x.figures || x.figures.length === 0)) return false;
      if (hasFigure === "no" && x.figures && x.figures.length > 0) return false;
      if (words.length && !words.every((w) => x._hay.includes(w))) return false;
      return true;
    });

    const dir = sort.endsWith("-asc") ? 1 : -1;
    const key = sort.split("-")[0];
    rows = rows.slice().sort((a, c) => {
      if (key === "year") {
        if (a.year !== c.year) return (a.year - c.year) * dir;
        if (a.paper !== c.paper) return a.paper < c.paper ? -1 : 1;
      } else if (key === "subject") {
        if (a.subject !== c.subject) return (a.subject < c.subject ? -1 : 1) * dir;
      } else if (key === "marks") {
        const am = a.marks || 0;
        const cm = c.marks || 0;
        if (am !== cm) return (am - cm) * dir;
      }
      return (
        String(a.number).localeCompare(String(c.number), undefined, { numeric: true }) ||
        (a.id < c.id ? -1 : 1)
      );
    });

    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    // Per-subject, year, type and topic facets for the current result set
    const facets = { subject: {}, year: {}, type: {}, topic: {} };
    for (const x of rows) {
      facets.subject[x.subject] = (facets.subject[x.subject] || 0) + 1;
      facets.year[x.year] = (facets.year[x.year] || 0) + 1;
      facets.type[x.type] = (facets.type[x.type] || 0) + 1;
      if (x.topic) {
        const topKey = `${x.subject}/${x.topic}`;
        facets.topic[topKey] = (facets.topic[topKey] || 0) + 1;
        facets.topic[x.topic] = (facets.topic[x.topic] || 0) + 1;
      }
    }

    res.json({
      ok: true,
      total: rows.length,
      offset,
      limit,
      facets,
      questions: rows.slice(offset, offset + limit).map(strip),
    });
  });

  /* One question, plus its neighbours in the same paper. */
  router.get("/api/gate/questions/:id", (req, res) => {
    const b = load();
    const q = b.byId.get(req.params.id);
    if (!q) return res.status(404).json({ ok: false, error: "Unknown question" });
    const samePaper = b.questions.filter((x) => x.paper === q.paper);
    const i = samePaper.indexOf(q);
    const group = q.group ? b.questions.filter((x) => x.paper === q.paper && x.group === q.group) : [];
    res.json({
      ok: true,
      question: strip(q),
      prev: i > 0 ? strip(samePaper[i - 1]) : null,
      next: i < samePaper.length - 1 ? strip(samePaper[i + 1]) : null,
      group: group.map(strip),
    });
  });

  return router;
}

module.exports = { createGateRouter };
