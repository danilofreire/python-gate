"""Run every generated snippet in real Python and compare with the JS answer.

Needs node, pandas, numpy and matplotlib. Run from anywhere:
python3 tests/check_answers.py
"""
import contextlib, io, json, os, subprocess, tempfile
from pathlib import Path

ext = Path(__file__).resolve().parent.parent
os.environ["MPLBACKEND"] = "Agg"  # draw plots in memory, with no windows
os.chdir(tempfile.mkdtemp())  # files saved by plotting questions land here

js = f"""
const {{ GENERATORS, TOPICS, RECENT, PASS, isCorrect, makeQuestion, nextWeight, recordAnswer }} = require("{ext}/questions.js");
const {{ DEFAULTS, gatedAt, loosensSchedule, streak, dayKey }} = require("{ext}/sites.js");
const assert = require("assert");

// Every generator has a unique id and a topic the popup knows about.
assert.equal(new Set(GENERATORS.map((g) => g.id)).size, GENERATORS.length);
assert.deepEqual([...new Set(GENERATORS.map((g) => g.topic))].sort(), [...TOPICS].sort());

// Only ticked topics come up, no ticks means all topics, and a heavier weight comes up more often.
const seen = new Set();
for (let k = 0; k < 3000; k++) seen.add(makeQuestion().topic);
assert.equal(seen.size, TOPICS.length);
const heavy = GENERATORS.find((g) => g.topic === "NumPy").id;
let hits = 0;
for (let k = 0; k < 3000; k++) {{
  const q = makeQuestion(["NumPy"], {{ [heavy]: 8 }});
  assert.equal(q.topic, "NumPy");
  hits += q.id === heavy;
}}
// With no immediate repeats, a type weighted 8 among 9 comes up 8/23 of the time (about 1043 in 3000);
// an unweighted type would come up about 333 times.
assert(hits > 850 && hits < 1250, `weighted type came up ${{hits}} times in 3000`);
assert.equal(nextWeight(undefined, false), 2);
assert.equal(nextWeight(8, false), 8);
assert.equal(nextWeight(0.25, true), 0.25);

// Harder questions stay out until their topic is unlocked.
for (let k = 0; k < 3000; k++) assert.equal(makeQuestion().level, 1);
let hard = 0;
for (let k = 0; k < 3000; k++) {{
  const q = makeQuestion(["NumPy"], {{}}, ["NumPy", "Lists"]);
  assert.equal(q.topic, "NumPy");
  hard += q.level === 2;
}}
assert(hard > 0);

// Progress: 17 right out of the last 20 unlocks a topic, 16 does not, and days are counted.
const play = (results) => results.reduce((stats, ok) => recordAnswer(stats, {{ id: "x", topic: "Lists" }}, ok, "2026-01-05"), DEFAULTS.stats);
const run = (wrong) => [...Array(wrong).fill(false), ...Array(RECENT - wrong).fill(true)];
assert.deepEqual(play(run(RECENT - PASS)).harder, ["Lists"]);
assert.deepEqual(play(run(RECENT - PASS + 1)).harder, []);
assert.deepEqual(play(run(3).slice(1)).harder, []); // only 19 answers so far
assert.deepEqual(play(run(3)).days, {{ "2026-01-05": [17, 20] }});
assert.equal(play([false, false, false, false, false]).weights.x, 8);

// Schedule: off means always gated; windows, weekdays and overnight windows work.
const sched = (on, from, to, weekdays) => ({{ on, from, to, weekdays }});
const work = sched(true, "09:00", "18:00", true), night = sched(true, "22:00", "06:00", false);
assert(gatedAt(DEFAULTS.schedule, 6, 200));
assert(gatedAt(work, 1, 9 * 60) && !gatedAt(work, 1, 18 * 60) && !gatedAt(work, 0, 600) && !gatedAt(work, 1, 8 * 60 + 59));
assert(gatedAt(night, 3, 23 * 60) && gatedAt(night, 3, 60) && !gatedAt(night, 3, 12 * 60));
assert(loosensSchedule(DEFAULTS.schedule, work) && !loosensSchedule(work, DEFAULTS.schedule));
assert(!loosensSchedule(work, sched(true, "08:00", "19:00", false)) && loosensSchedule(work, sched(true, "10:00", "18:00", true)));
assert(!loosensSchedule(work, work));

// Streak: counts back from today, or from yesterday if today has no answers yet.
const ago = (n) => {{ const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); }};
assert.equal(streak({{}}), 0);
assert.equal(streak({{ [ago(0)]: [1, 1], [ago(1)]: [1, 1], [ago(3)]: [1, 1] }}), 2);
assert.equal(streak({{ [ago(1)]: [1, 1], [ago(2)]: [1, 1] }}), 2);

const out = [];
GENERATORS.forEach((g, i) => {{ for (let k = 0; k < 300; k++) {{
  const q = g.make();
  out.push({{ i, ...q, selfOk: q.accept.every((a) => isCorrect(a, q.accept)) }});
}} }});
console.log(JSON.stringify(out));
"""
node = subprocess.run(["node", "-e", js], capture_output=True, text=True)
if node.returncode:
    raise SystemExit(node.stderr)
qs = json.loads(node.stdout)


def run(code):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(code, {})
    if "plot" in code or "plt" in code:
        import matplotlib.pyplot as plt
        plt.close("all")
    return buf.getvalue().rstrip("\n")


def check(q):
    """Return a list of (got, wanted) pairs, one per accepted answer."""
    if q.get("bug"):  # the fixed code prints the target, and the buggy code does not
        try:
            broken = run(q["raw"])
        except Exception as err:
            broken = repr(err)
        return [(run(q["fixed"]), q["expect"]), (str(broken != q["expect"]), "True")]
    if not q.get("blank"):
        return [(run(q["code"]), q["answer"])]
    assert q["code"].count("____") == 1
    results = []
    for alt in q["accept"]:
        filled = q["code"].replace("____", alt)
        if "verify" in q:  # no printed output: the verify code raises if the plot is wrong
            try:
                run(filled + "\n" + q["verify"])
                results.append(("ok", "ok"))
            except Exception as err:
                results.append((repr(err), "ok"))
        else:
            results.append((run(filled), q["expect"]))
    return results


bad = blanks = 0
for q in qs:
    blanks += bool(q.get("blank"))
    results = check(q)
    if any(got != want for got, want in results) or not q["selfOk"]:
        bad += 1
        if bad <= 10:
            print("MISMATCH gen", q["i"], repr(q["code"]), results)
print(f"{len(qs)} questions ({blanks} fill-in), {bad} mismatches, {len(set(q['i'] for q in qs))} generators")
