/*
 * GATE grading rules — the one implementation used by the CBT evaluator
 * (POST /api/gate/evaluate), practice attempts (POST /api/gate/attempts) and
 * custom tests (POST /api/gate/tests/:id/submit).
 *
 *  - MCQ: full marks if correct, −marks/3 if wrong (1-mark −1/3, 2-mark −2/3).
 *  - MSQ: exact set match, no negative marks.
 *  - NAT: within a "lo:hi" / "lo to hi" range (±0.01) or ±0.05 of the key.
 *  - Old-pattern TF / fill-in / descriptive: loose text match, never negative.
 *  - Official keys may list alternatives separated by " or ".
 */

/*
  Official keys sometimes accept more than one answer ("A;C;D or C;D",
  "2 to 2 OR 4 to 4"). A response is correct if it matches any alternative.
*/
function keyAlternatives(answer) {
  if (typeof answer !== "string") return [answer];
  return answer.split(/\s+or\s+/i).map((a) => a.trim()).filter(Boolean);
}

/** A NAT range key — "lo:hi" or "lo to hi" — as [lo, hi], else null. */
function natRange(key) {
  if (typeof key !== "string") return null;
  const m = key.match(/^\s*(-?[\d.]+)\s*(?::|to)\s*(-?[\d.]+)\s*$/i);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** Whether a response counts as an answer (not blank / empty selection). */
function isAnswered(userAns) {
  return userAns !== undefined && userAns !== null && userAns !== "" && !(Array.isArray(userAns) && userAns.length === 0);
}

/** Marks a question carries (unknown → 1, as in the evaluator). */
function questionMarks(q) {
  return q.marks != null ? q.marks : 1;
}

/**
 * Grade one response against a bank question.
 * @returns {{ attempted: boolean, correct: boolean, marks: number, max: number }}
 *   `marks` is unrounded (−marks/3 for a wrong MCQ).
 */
function gradeQuestion(q, userAns) {
  const qMarks = questionMarks(q);
  if (!isAnswered(userAns)) return { attempted: false, correct: false, marks: 0, max: qMarks };

  let isCorrect = false;
  let marksAwarded = 0;
  if (q.type === "MSQ") {
    let uArr = Array.isArray(userAns) ? userAns : [userAns];
    uArr = uArr.map((x) => String(x).trim().toUpperCase()).sort();
    isCorrect = keyAlternatives(q.answer).some((key) => {
      let tArr = [];
      if (Array.isArray(key)) tArr = key.map((x) => String(x).trim().toUpperCase());
      else if (typeof key === "string") tArr = key.split(/[,;\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
      tArr.sort();
      return uArr.length === tArr.length && uArr.every((v, i) => v === tArr[i]);
    });
    // MSQ has zero negative marking
    marksAwarded = isCorrect ? qMarks : 0;
  } else if (q.type === "NAT") {
    const userNum = Number(userAns);
    if (!isNaN(userNum)) {
      isCorrect = keyAlternatives(q.answer).some((key) => {
        const range = natRange(key);
        if (range) return userNum >= range[0] - 0.01 && userNum <= range[1] + 0.01;
        return Math.abs(userNum - Number(key)) <= 0.05;
      });
    }
    // NAT has zero negative marking
    marksAwarded = isCorrect ? qMarks : 0;
  } else if (q.type === "MCQ" || (q.options && q.options.length > 0)) {
    isCorrect = keyAlternatives(q.answer).some((key) => String(userAns).trim().toUpperCase() === String(key).trim().toUpperCase());
    // 1-mark: -1/3, 2-mark: -2/3 (only MCQs carry negative marks)
    marksAwarded = isCorrect ? qMarks : q.type === "MCQ" ? -(qMarks / 3) : 0;
  } else {
    // Old-pattern True/False, fill-in and descriptive answers: a loose
    // text match, never negative.
    const norm = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9.]+/g, "");
    const u = norm(userAns);
    const key = norm(q.answer);
    isCorrect = q.type === "TF" ? !!u && key.startsWith(u) : !!u && u === key;
    marksAwarded = isCorrect ? qMarks : 0;
  }
  return { attempted: true, correct: isCorrect, marks: marksAwarded, max: qMarks };
}

module.exports = { gradeQuestion, isAnswered, keyAlternatives, natRange, questionMarks };
