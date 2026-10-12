"""Run every generated snippet in real Python and compare with the JS answer.

Needs node, pandas and numpy. Run from anywhere: python3 tests/check_answers.py
"""
import contextlib, io, json, subprocess
from pathlib import Path

ext = Path(__file__).resolve().parent.parent
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
    return buf.getvalue().rstrip("\n")


bad = blanks = 0
for q in qs:
    if q.get("blank"):
        blanks += 1
        assert q["code"].count("____") == 1
        results = [(run(q["code"].replace("____", alt)), q["expect"]) for alt in q["accept"]]
    else:
        results = [(run(q["code"]), q["answer"])]
    if any(got != want for got, want in results) or not q["selfOk"]:
        bad += 1
        if bad <= 10:
            print("MISMATCH gen", q["i"], repr(q["code"]), results)
print(f"{len(qs)} questions ({blanks} fill-in), {bad} mismatches, {len(set(q['i'] for q in qs))} generators")
