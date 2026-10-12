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
const {{ GENERATORS, isCorrect }} = require("{ext}/questions.js");
const out = [];
GENERATORS.forEach((g, i) => {{ for (let k = 0; k < 300; k++) {{
  const q = g();
  out.push({{ i, ...q, selfOk: q.accept.every((a) => isCorrect(a, q.accept)) }});
}} }});
console.log(JSON.stringify(out));
"""
qs = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)


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
