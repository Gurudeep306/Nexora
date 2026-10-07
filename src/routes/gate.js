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
  let mtime = 0;
  try {
    mtime = fs.statSync(FILE).mtimeMs;
    if (bank && mtime === lastMtime) return bank;
  } catch (_) {}
  if (bank && mtime === 0) return bank;
  lastMtime = mtime;
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const rawQuestions = Array.isArray(raw) ? raw : (raw.questions || []);
  const questions = rawQuestions.map((q) => ({
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
  const baseObj = Array.isArray(raw) ? { version: 1, generated: "2026-10-05", papers: [], subjects: { CSE: {}, DA: {} } } : raw;
  bank = { ...baseObj, questions, byId: new Map(questions.map((q) => [q.id, q])) };
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
    const byExam = {};

    // Clone subjects so we can dynamically register any missing topics
    const subjects = JSON.parse(JSON.stringify(b.subjects || { CSE: {}, DA: {} }));

    for (const q of b.questions) {
      if (!q || !q.subject) continue;
      const key = `${q.exam === "DA" ? "DA" : "CSE"}:${q.subject}`;
      bySubject[key] = (bySubject[key] || 0) + 1;
      byYear[q.year] = (byYear[q.year] || 0) + 1;
      byType[q.type] = (byType[q.type] || 0) + 1;
      byExam[q.exam] = (byExam[q.exam] || 0) + 1;

      // Ensure every subject and topic present on any question is registered in meta
      const stream = q.exam === "DA" ? "DA" : "CSE";
      if (!subjects[stream]) subjects[stream] = {};
      if (!subjects[stream][q.subject]) {
        subjects[stream][q.subject] = {
          name: q.subject.toUpperCase(),
          topics: {},
        };
      }
      if (q.topic && !subjects[stream][q.subject].topics[q.topic]) {
        subjects[stream][q.subject].topics[q.topic] = q.topic
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    res.json({
      ok: true,
      generated: b.generated,
      total: b.questions.length,
      papers: b.papers,
      subjects,
      counts: { bySubject, byYear, byType, byExam },
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
      if ((hasFigure === "yes" || hasFigure === "true" || hasFigure === true) && (!x.figures || x.figures.length === 0)) return false;
      if ((hasFigure === "no" || hasFigure === "false" || hasFigure === false) && x.figures && x.figures.length > 0) return false;
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

    // Per-exam, subject, year, type, marks, figures, and topic facets for the current result set
    const facets = { exam: {}, subject: {}, year: {}, type: {}, marks: {}, hasFigure: { yes: 0, no: 0 }, paper: {}, topic: {} };
    for (const x of rows) {
      facets.exam[x.exam] = (facets.exam[x.exam] || 0) + 1;
      facets.subject[x.subject] = (facets.subject[x.subject] || 0) + 1;
      facets.year[x.year] = (facets.year[x.year] || 0) + 1;
      facets.type[x.type] = (facets.type[x.type] || 0) + 1;
      facets.marks[String(x.marks)] = (facets.marks[String(x.marks)] || 0) + 1;
      if (x.figures && x.figures.length > 0) {
        facets.hasFigure.yes += 1;
      } else {
        facets.hasFigure.no += 1;
      }
      if (x.paper) facets.paper[x.paper] = (facets.paper[x.paper] || 0) + 1;
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

  /* Full paper for CBT Examination Mode */
  router.get("/api/gate/paper/:paperId", (req, res) => {
    const b = load();
    const paper = b.papers.find((p) => p.id === req.params.paperId);
    if (!paper) return res.status(404).json({ ok: false, error: "Paper not found" });

    const questions = b.questions
      .filter((x) => x.paper === paper.id)
      .slice()
      .sort((a, c) => {
        // General Aptitude first, then subject questions
        const aSec = a.section === "ga" ? 0 : 1;
        const cSec = c.section === "ga" ? 0 : 1;
        if (aSec !== cSec) return aSec - cSec;
        return (
          Number(a.number) - Number(c.number) ||
          String(a.number).localeCompare(String(c.number), undefined, { numeric: true }) ||
          (a.id < c.id ? -1 : 1)
        );
      });

    const gaQuestions = questions.filter((q) => q.section === "ga");
    const subQuestions = questions.filter((q) => q.section !== "ga");

    const sections = [
      {
        id: "ga",
        title: "General Aptitude",
        count: gaQuestions.length,
        marks: gaQuestions.reduce((acc, q) => acc + (q.marks || 1), 0),
      },
      {
        id: "subject",
        title: paper.exam === "DA" ? "Data Science & AI" : "Computer Science & IT",
        count: subQuestions.length,
        marks: subQuestions.reduce((acc, q) => acc + (q.marks || 1), 0),
      },
    ];

    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 1), 0);

    res.json({
      ok: true,
      paper,
      sections,
      totalQuestions: questions.length,
      totalMarks,
      durationMinutes: 180,
      questions: questions.map(strip),
    });
  });

  /* Official GATE Examination Evaluator */
  router.post("/api/gate/evaluate", (req, res) => {
    const b = load();
    const { paperId, responses = {}, timeSpent = {} } = req.body || {};
    const paper = b.papers.find((p) => p.id === paperId);
    if (!paper) return res.status(404).json({ ok: false, error: "Paper not found" });

    const questions = b.questions.filter((x) => x.paper === paper.id);

    let totalScore = 0;
    let maxMarks = 0;
    let positiveMarks = 0;
    let negativeMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    const sectionStats = {
      ga: { score: 0, max: 0, correct: 0, incorrect: 0, unattempted: 0 },
      subject: { score: 0, max: 0, correct: 0, incorrect: 0, unattempted: 0 },
    };

    const subjectStats = {};

    const evaluationDetails = questions.map((q) => {
      const qMarks = q.marks != null ? q.marks : 1;
      maxMarks += qMarks;

      const secKey = q.section === "ga" ? "ga" : "subject";
      sectionStats[secKey].max += qMarks;

      if (!subjectStats[q.subject]) {
        subjectStats[q.subject] = { score: 0, max: 0, correct: 0, incorrect: 0, unattempted: 0 };
      }
      subjectStats[q.subject].max += qMarks;

      const userAns = responses[q.id];
      const time = timeSpent[q.id] || 0;

      let isAttempted = false;
      let isCorrect = false;
      let marksAwarded = 0;

      if (userAns !== undefined && userAns !== null && userAns !== "" && !(Array.isArray(userAns) && userAns.length === 0)) {
        isAttempted = true;
      }

      if (!isAttempted) {
        unattemptedCount++;
        sectionStats[secKey].unattempted++;
        subjectStats[q.subject].unattempted++;
      } else {
        if (q.type === "MSQ") {
          let uArr = Array.isArray(userAns) ? userAns : [userAns];
          uArr = uArr.map((x) => String(x).trim().toUpperCase()).sort();
          let tArr = [];
          if (Array.isArray(q.answer)) tArr = q.answer.map((x) => String(x).trim().toUpperCase());
          else if (typeof q.answer === "string") tArr = q.answer.split(/[,;\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
          tArr.sort();
          isCorrect = uArr.length === tArr.length && uArr.every((v, i) => v === tArr[i]);
          if (isCorrect) {
            marksAwarded = qMarks;
          } else {
            // MSQ has zero negative marking
            marksAwarded = 0;
          }
        } else if (q.type === "NAT") {
          const userNum = Number(userAns);
          if (!isNaN(userNum)) {
            if (typeof q.answer === "number") {
              isCorrect = Math.abs(userNum - q.answer) <= 0.05;
            } else if (typeof q.answer === "string" && q.answer.includes(":")) {
              const [lo, hi] = q.answer.split(":").map(Number);
              isCorrect = userNum >= lo - 0.01 && userNum <= hi + 0.01;
            } else {
              isCorrect = Math.abs(userNum - Number(q.answer)) <= 0.05;
            }
          }
          if (isCorrect) {
            marksAwarded = qMarks;
          } else {
            // NAT has zero negative marking
            marksAwarded = 0;
          }
        } else {
          // Standard MCQ
          isCorrect = String(userAns).trim().toUpperCase() === String(q.answer).trim().toUpperCase();
          if (isCorrect) {
            marksAwarded = qMarks;
          } else {
            // 1-mark: -1/3, 2-mark: -2/3
            marksAwarded = -(qMarks / 3);
          }
        }

        if (isCorrect) {
          correctCount++;
          positiveMarks += qMarks;
          sectionStats[secKey].correct++;
          subjectStats[q.subject].correct++;
        } else {
          incorrectCount++;
          if (marksAwarded < 0) {
            negativeMarks += Math.abs(marksAwarded);
          }
          sectionStats[secKey].incorrect++;
          subjectStats[q.subject].incorrect++;
        }
      }

      totalScore += marksAwarded;
      sectionStats[secKey].score += marksAwarded;
      subjectStats[q.subject].score += marksAwarded;

      return {
        id: q.id,
        number: q.number,
        section: q.section,
        subject: q.subject,
        topic: q.topic,
        type: q.type,
        marks: qMarks,
        userAnswer: userAns,
        officialAnswer: q.answer,
        isAttempted,
        isCorrect,
        marksAwarded: Number(marksAwarded.toFixed(2)),
        timeSpentSeconds: time,
      };
    });

    // Clean decimals
    totalScore = Math.max(0, Number(totalScore.toFixed(2)));
    positiveMarks = Number(positiveMarks.toFixed(2));
    negativeMarks = Number(negativeMarks.toFixed(2));
    sectionStats.ga.score = Number(sectionStats.ga.score.toFixed(2));
    sectionStats.subject.score = Number(sectionStats.subject.score.toFixed(2));

    for (const k of Object.keys(subjectStats)) {
      subjectStats[k].score = Number(subjectStats[k].score.toFixed(2));
      const att = subjectStats[k].correct + subjectStats[k].incorrect;
      subjectStats[k].accuracy = att > 0 ? Math.round((subjectStats[k].correct / att) * 100) : 0;
    }

    const totalAttempted = correctCount + incorrectCount;
    const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

    // Rank and Percentile calculation
    let predictedAir = "15000+";
    let percentile = 70.0;
    if (totalScore >= 80) {
      predictedAir = "1 – 30 (Top Tier)";
      percentile = 99.99;
    } else if (totalScore >= 70) {
      predictedAir = "31 – 150 (IISc / Top IITs)";
      percentile = 99.8;
    } else if (totalScore >= 60) {
      predictedAir = "151 – 500 (Old IITs)";
      percentile = 99.3;
    } else if (totalScore >= 50) {
      predictedAir = "501 – 1500 (Top NITs / Newer IITs)";
      percentile = 98.0;
    } else if (totalScore >= 40) {
      predictedAir = "1501 – 4000";
      percentile = 95.0;
    } else if (totalScore >= 30) {
      predictedAir = "4001 – 9000";
      percentile = 89.0;
    } else if (totalScore >= 25) {
      predictedAir = "9001 – 15000 (Qualified)";
      percentile = 78.0;
    } else {
      predictedAir = "Below Cutoff (< 25 marks)";
      percentile = Math.max(10, Math.round((totalScore / 25) * 65));
    }

    res.json({
      ok: true,
      paperId,
      paperTitle: `GATE ${paper.exam} ${paper.year}${paper.set ? ` Set ${paper.set}` : ""}`,
      totalScore,
      maxMarks,
      positiveMarks,
      negativeMarks,
      accuracy,
      attemptedCount: totalAttempted,
      unattemptedCount,
      correctCount,
      incorrectCount,
      sectionStats,
      subjectStats,
      predictedAir,
      percentile,
      evaluationDetails,
    });
  });

  /* AI Attempt Diagnostic Analyzer */
  router.post("/api/gate/ai-analysis", (req, res) => {
    const { evalResult, attemptHistory = {} } = req.body || {};
    if (!evalResult) return res.status(400).json({ ok: false, error: "Evaluation data required" });

    const { totalScore, maxMarks, accuracy, negativeMarks, attemptedCount, subjectStats, sectionStats } = evalResult;

    // Diagnose cognitive patterns
    const negativeRatio = totalScore > 0 ? Number(((negativeMarks / (totalScore + negativeMarks)) * 100).toFixed(1)) : 0;
    let negativeRisk = "Safe & Disciplined";
    if (negativeMarks >= 6) negativeRisk = "High Risk (Aggressive Guessing)";
    else if (negativeMarks >= 3) negativeRisk = "Moderate Risk (Occasional Gamble)";

    // Identify strong vs weak subjects
    const strengths = [];
    const vulnerabilities = [];
    for (const [subj, data] of Object.entries(subjectStats || {})) {
      if (data.max >= 4) {
        if (data.accuracy >= 70 && data.score >= data.max * 0.6) {
          strengths.push({ subject: subj, score: data.score, max: data.max, accuracy: data.accuracy });
        } else if (data.accuracy < 50 || data.score <= data.max * 0.3) {
          vulnerabilities.push({ subject: subj, score: data.score, max: data.max, accuracy: data.accuracy });
        }
      }
    }

    strengths.sort((a, b) => b.accuracy - a.accuracy);
    vulnerabilities.sort((a, b) => a.accuracy - b.accuracy);

    // Speed vs accuracy profiling
    let speedAccuracyProfile = "Balanced Test-Taker";
    if (accuracy >= 80 && attemptedCount >= 45) {
      speedAccuracyProfile = "High Mastery & High Velocity (Elite Ranker Track)";
    } else if (accuracy >= 80 && attemptedCount < 40) {
      speedAccuracyProfile = "High Precision, Low Volume (Too Cautious, missed easy scoring opportunities)";
    } else if (accuracy < 60 && attemptedCount >= 50) {
      speedAccuracyProfile = "Rushed Attempt with Excessive Friction (Over-attempting without validation)";
    } else if (accuracy < 60 && attemptedCount < 40) {
      speedAccuracyProfile = "Foundational Knowledge Gaps (Requires conceptual strengthening)";
    }

    // Actionable 3-point prescription
    const recommendations = [];
    if (vulnerabilities.length > 0) {
      const topWeak = vulnerabilities.slice(0, 2).map((v) => v.subject.toUpperCase()).join(" and ");
      recommendations.push(`Intensive Targeted Revision: Focus on ${topWeak} where low accuracy incurred point penalties.`);
    }
    if (negativeMarks >= 4) {
      recommendations.push(`Cut Down Flawed MCQ Guesses: You surrendered ${negativeMarks} marks to negative marking. Restrict 50-50 elimination gambles.`);
    } else {
      recommendations.push(`Maximize NAT & MSQ Boldness: Numerical (NAT) and Multiple-Select (MSQ) questions have 0 negative marks; always attempt high-confidence calculations.`);
    }
    if (sectionStats?.ga?.score < 11) {
      recommendations.push(`General Aptitude Boost: GA yields 15 relatively high-yield marks with moderate effort. Practicing 15 mins daily can recover 4–6 additional marks.`);
    } else {
      recommendations.push(`Maintain GA Pacing: Keep your General Aptitude completion time strictly under 18–20 minutes to preserve deep problem-solving time for 2-mark CS problems.`);
    }

    res.json({
      ok: true,
      analysis: {
        speedAccuracyProfile,
        negativeRisk,
        negativePenaltyRatio: `${negativeRatio}%`,
        strengths,
        vulnerabilities,
        recommendations,
        executiveSummary: `Scored ${totalScore}/${maxMarks} with ${accuracy}% accuracy. Negative penalty was ${negativeMarks} marks. ${strengths.length} subject strength areas identified.`,
      },
    });
  });

  return router;
}

module.exports = { createGateRouter };
