// Question bank. Each generator builds a short Python snippet with random
// values and works out what it prints, so questions rarely repeat exactly.

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (xs) => xs[rand(0, xs.length - 1)];
const nums = (n, lo = 1, hi = 20) => Array.from({ length: n }, () => rand(lo, hi));
const distinct = (n, lo = 1, hi = 20) => {
  const set = new Set();
  while (set.size < n) set.add(rand(lo, hi));
  return [...set];
};

// How Python shows a value inside a list (repr) and on its own (print).
const repr = (v) =>
  Array.isArray(v) ? "[" + v.map(repr).join(", ") + "]"
  : typeof v === "string" ? `'${v}'`
  : typeof v === "boolean" ? (v ? "True" : "False")
  : v === null ? "None"
  : String(v);
const printed = (v) => (typeof v === "string" ? v : repr(v));

// How a value is written in the Python source shown to the user.
const src = (v) =>
  Array.isArray(v) ? "[" + v.map(src).join(", ") + "]"
  : typeof v === "string" ? `"${v}"`
  : repr(v);

// "What does this print?" question.
const q = (code, answer, why) => ({ code, answer: printed(answer), accept: [printed(answer)], why });

// "What goes in the blank?" question. The code has one ____ and ends with a
// call whose expected output is shown, and accept lists every valid filling.
const fb = (body, call, expect, accept, why) => ({
  code: `${body}\n\nprint(${call})  # should print ${printed(expect)}`,
  answer: accept[0], accept, blank: true, expect: printed(expect), why,
});

const WORDS = ["python", "pandas", "emory", "matrix", "random", "sample", "vector", "column"];
const NAMES = ["Ana", "Ben", "Caio", "Dana"];

// ---- pandas helpers ----
const CITY_SETS = [
  ["Rio", "Lima", "Rio", "Quito"],
  ["Lima", "Lima", "Quito", "Rio"],
  ["Quito", "Rio", "Quito", "Quito"],
];
const add = (xs) => xs.reduce((a, b) => a + b, 0);
const pyFloat = (x) => (Number.isInteger(x) ? `${x}.0` : String(x));

// A four-row DataFrame with distinct sales, plus the Python code that builds it.
function frame() {
  const city = pick(CITY_SETS), sales = distinct(4, 2, 15);
  return { city, sales, setup: frameCode(city, sales) };
}
const floats = (xs) => "[" + xs.map(pyFloat).join(", ") + "]";

// A 2 x 3 NumPy array plus the Python code that builds it.
function matrix() {
  const m = [nums(3, 1, 9), nums(3, 1, 9)];
  return { m, setup: `import numpy as np\nm = np.array([${src(m[0])},\n              ${src(m[1])}])\n` };
}
const NP = "import numpy as np\n";

// Fill-in question with no printed output (plots). `verify` is Python that the
// test script runs after the filled-in code; it must not raise an error.
const fv = (code, accept, why, verify) => ({ code, answer: accept[0], accept, blank: true, verify, why });

// "Which line has the bug?" question. The lines are shown numbered. Replacing
// line `badLine` with `fixedLine` must make the code print `expect`.
const bug = (lines, badLine, fixedLine, expect, why) => ({
  code: lines.map((line, i) => `${i + 1}  ${line}`).join("\n") + `\n\n# should print ${printed(expect)}`,
  prompt: "One line has a bug. Which line number?",
  answer: String(badLine), accept: [String(badLine)], bug: true,
  raw: lines.join("\n"),
  fixed: lines.map((line, i) => (i === badLine - 1 ? fixedLine : line)).join("\n"),
  expect: printed(expect), why,
});

// In the bank, generators after this marker are the harder ones for their topic.
const HARDER = Symbol("harder");

const PLT = "import matplotlib.pyplot as plt\n";
const XY = PLT + "x = [1, 2, 3, 4]\ny = [2, 4, 5, 8]\n";

// A decimal number as text, with digits chosen so rounding never lands on a tie.
const decimal = (places) =>
  `${rand(1, 99)}.${Array.from({ length: places }, (_, i) => (i === places - 1 ? pick([1, 2, 3, 4, 6, 7, 8, 9]) : rand(0, 9))).join("")}`;

// Two small tables for merge questions, plus the Python code that builds them.
function tables() {
  const names = NAMES, ids = [1, 2, rand(1, 3), rand(1, 3)];
  const courseIds = pick([[1, 2], [1, 2, 4]]);
  const titles = ["Stats", "Python", "Ethics"].slice(0, courseIds.length);
  const setup = `import pandas as pd\nstudents = pd.DataFrame({\n    "name": ${src(names)},\n    "course_id": ${src(ids)},\n})\n`
    + `courses = pd.DataFrame({\n    "course_id": ${src(courseIds)},\n    "title": ${src(titles)},\n})\n`;
  const matched = ids.filter((i) => courseIds.includes(i)).length;
  const unused = courseIds.filter((c) => !ids.includes(c)).length;
  return { names, ids, courseIds, titles, setup, matched, unused };
}

// A three-person dictionary of distinct ages, plus the Python code that builds it.
function agesDict() {
  const values = distinct(3, 18, 60);
  const pairs = NAMES.slice(0, 3).map((name, i) => [name, values[i]]);
  return { pairs, code: `ages = {${pairs.map(([name, age]) => `"${name}": ${age}`).join(", ")}}\n` };
}

// Per-city sales for groupby questions. Cities are sorted, as pandas sorts groups.
function groups(city, sales) {
  const rows = {}, sum = {}, size = {};
  city.forEach((c, i) => (rows[c] = rows[c] || []).push(sales[i]));
  const cities = Object.keys(rows).sort();
  cities.forEach((c) => { sum[c] = add(rows[c]); size[c] = rows[c].length; });
  return { cities, rows, sum, size };
}

const frameCode = (city, sales) =>
  `import pandas as pd\ndf = pd.DataFrame({\n    "city": ${src(city)},\n    "sales": ${src(sales)},\n})\n`;

// The question bank. A string names the topic of the generators that follow
// it, and HARDER marks the ones that only appear once a topic is going well.
const BANK = [
  "Numbers and types",
  () => {
    const a = rand(7, 29), b = rand(2, 5);
    return q(`print(${a} // ${b})`, Math.floor(a / b), "// divides and drops the decimal part.");
  },
  () => {
    const a = rand(7, 29), b = rand(2, 5);
    return q(`print(${a} % ${b})`, a % b, "% gives the remainder of the division.");
  },
  () => {
    const b = pick([2, 4, 5]), a = b * rand(2, 6);
    return q(`print(${a} / ${b})`, `${a / b}.0`, "/ always returns a float, even when the division is exact.");
  },
  () => {
    const a = rand(2, 5), b = rand(2, 3);
    return q(`print(${a} ** ${b})`, a ** b, "** is the power operator.");
  },
  () => {
    const a = rand(2, 9), b = rand(2, 5), c = rand(2, 5);
    return q(`print(${a} + ${b} * ${c})`, a + b * c, "Multiplication runs before addition.");
  },
  () => {
    const n = rand(2, 9), f = `${rand(2, 9)}.${rand(5, 9)}`;
    return pick([
      q(`print(int("${n}") + 2)`, n + 2, "int() turns the string into a number, so + adds."),
      q(`print("${n}" + "2")`, `${n}2`, "+ between two strings joins them."),
      q(`print("${n}" * 2)`, `${n}${n}`, "A string times a number repeats the string."),
      q(`print(int(${f}))`, parseInt(f), "int() cuts off the decimal part. It does not round."),
      q(`print(float(${n}))`, `${n}.0`, "float() turns the integer into a decimal number."),
    ]);
  },

  "Strings",
  () => {
    const w = pick(WORDS);
    return q(`print(len("${w}"))`, w.length, "len() counts the characters.");
  },
  () => {
    const w = pick(WORDS), i = rand(0, w.length - 1);
    const shown = rand(0, 1) ? i : i - w.length;
    return q(`word = "${w}"\nprint(word[${shown}])`, w[i],
      "Indexes start at 0. Negative indexes count from the end, so -1 is the last character.");
  },
  () => {
    const w = pick(WORDS), a = rand(0, 2), b = rand(a + 2, 5);
    return q(`word = "${w}"\nprint(word[${a}:${b}])`, w.slice(a, b),
      "A slice [a:b] starts at index a and stops before index b.");
  },
  () => {
    const w = pick(WORDS);
    return pick([
      q(`print("${w}".upper())`, w.toUpperCase(), ".upper() returns the string in capital letters."),
      q(`print("${w}".capitalize())`, w[0].toUpperCase() + w.slice(1), ".capitalize() makes only the first letter a capital."),
      q(`print("${w}".replace("a", "o"))`, w.replaceAll("a", "o"), ".replace() swaps every match, not only the first."),
    ]);
  },
  () => {
    const s = pick(["ab", "ha", "xy", "no"]), n = rand(2, 4);
    return q(`print("${s}" * ${n})`, s.repeat(n), "A string times a number repeats the string.");
  },
  () => {
    const n = rand(1, 12);
    return q(`n = ${n}\nprint("lecture" + str(n))`, `lecture${n}`, "str() turns the number into text so + can join them.");
  },
  () => {
    const name = pick(NAMES), n = rand(2, 9);
    return q(`name = "${name}"\nn = ${n}\nprint(f"{name} has {n * 2} cats")`, `${name} has ${n * 2} cats`,
      "An f-string runs the code inside each { } and inserts the result.");
  },
  () => {
    const parts = pick([["a", "b", "c"], ["x", "y"], ["red", "blue", "green"]]);
    return pick([
      q(`print("${parts.join("-")}".split("-"))`, parts, ".split() cuts the string at each separator and returns a list."),
      q(`print("-".join(${src(parts)}))`, parts.join("-"), ".join() glues the list items together with the separator between them."),
      q(`print(len("${parts.join(" ")}".split()))`, parts.length, ".split() with no argument cuts at spaces, then len() counts the pieces."),
    ]);
  },
  () => {
    const w = pick(["abc", "dog", "data"]);
    return q(`s = ""\nfor ch in "${w}":\n    s = ch + s\nprint(s)`, [...w].reverse().join(""),
      "Each new character goes in front of s, so the word comes out reversed.");
  },

  "Lists",
  () => {
    const xs = nums(5), i = rand(0, 4);
    const shown = rand(0, 1) ? i : i - 5;
    return q(`xs = ${src(xs)}\nprint(xs[${shown}])`, xs[i],
      "Indexes start at 0. Negative indexes count from the end, so -1 is the last item.");
  },
  () => {
    const xs = nums(5), a = rand(0, 2), b = rand(a + 1, 4);
    return q(`xs = ${src(xs)}\nprint(xs[${a}:${b}])`, xs.slice(a, b),
      "A slice [a:b] starts at index a and stops before index b.");
  },
  () => {
    const xs = nums(3), v = rand(1, 20);
    return pick([
      q(`xs = ${src(xs)}\nxs.append(${v})\nprint(xs)`, [...xs, v], ".append() adds one item to the end of the list."),
      q(`xs = ${src(xs)}\nxs.append(${v})\nprint(len(xs))`, 4, ".append() adds one item, so the list grows by one."),
    ]);
  },
  () => {
    const xs = nums(4);
    return pick([
      q(`print(sum(${src(xs)}))`, xs.reduce((a, b) => a + b), "sum() adds all the items."),
      q(`print(max(${src(xs)}))`, Math.max(...xs), "max() returns the largest item."),
      q(`print(min(${src(xs)}))`, Math.min(...xs), "min() returns the smallest item."),
      q(`print(sorted(${src(xs)}))`, [...xs].sort((a, b) => a - b), "sorted() returns a new list from smallest to largest."),
    ]);
  },
  () => {
    const xs = nums(4), i = rand(0, 3), v = rand(30, 50);
    const ys = [...xs];
    ys[i] = v;
    return q(`xs = ${src(xs)}\nxs[${i}] = ${v}\nprint(xs)`, ys, "Assigning to xs[i] replaces the item at index i.");
  },
  () => {
    const xs = nums(4, 1, 9), k = rand(2, 3);
    return q(`print([x * ${k} for x in ${src(xs)}])`, xs.map((x) => x * k),
      "A list comprehension applies the expression to every item.");
  },
  () => {
    const xs = nums(5), k = rand(6, 14);
    return q(`xs = ${src(xs)}\nprint([x for x in xs if x > ${k}])`, xs.filter((x) => x > k),
      "The if at the end keeps only the items that pass the test.");
  },
  () => {
    const xs = nums(4), v = rand(0, 1) ? pick(xs) : rand(21, 30);
    const w = pick(WORDS), ch = pick(["a", "e", "o"]);
    return pick([
      q(`print(${v} in ${src(xs)})`, xs.includes(v), "in checks whether the value is one of the items."),
      q(`print("${ch}" in "${w}")`, w.includes(ch), "With strings, in checks whether the text appears inside."),
    ]);
  },

  "Loops and conditions",
  () => {
    const n = rand(3, 6);
    let total = 0;
    for (let i = 0; i < n; i++) total += i;
    return q(`total = 0\nfor i in range(${n}):\n    total += i\nprint(total)`, total,
      `range(${n}) goes from 0 to ${n - 1}. It stops before ${n}.`);
  },
  () => {
    const a = rand(1, 4), b = a + rand(3, 5), step = rand(2, 3);
    const stepped = [];
    for (let i = a; i < b + 4; i += step) stepped.push(i);
    return pick([
      q(`print(list(range(${a}, ${b})))`, Array.from({ length: b - a }, (_, i) => a + i), "range(a, b) starts at a and stops before b."),
      q(`print(len(range(${a}, ${b})))`, b - a, "range(a, b) stops before b, so it has b - a numbers."),
      q(`print(list(range(${a}, ${b + 4}, ${step})))`, stepped, "The third number is the step between values."),
    ]);
  },
  () => {
    const x = rand(1, 20);
    return q(`x = ${x}\nif x > 15:\n    print("high")\nelif x > 8:\n    print("medium")\nelse:\n    print("low")`,
      x > 15 ? "high" : x > 8 ? "medium" : "low",
      "Python checks the conditions from top to bottom and runs only the first one that is True.");
  },
  () => {
    const xs = nums(5);
    return q(`count = 0\nfor x in ${src(xs)}:\n    if x % 2 == 0:\n        count += 1\nprint(count)`,
      xs.filter((x) => x % 2 === 0).length, "x % 2 == 0 is True for even numbers, so the loop counts them.");
  },
  () => {
    const step = rand(2, 4), limit = rand(5, 12);
    let n = 0;
    while (n < limit) n += step;
    return q(`n = 0\nwhile n < ${limit}:\n    n += ${step}\nprint(n)`, n,
      `The loop keeps adding ${step} and stops the first time n is no longer below ${limit}.`);
  },
  () => {
    const a = rand(1, 9), b = rand(1, 9), c = rand(1, 9);
    return pick([
      q(`print(${a} > ${b} and ${b} > ${c})`, a > b && b > c, "and is True only when both sides are True."),
      q(`print(${a} > ${b} or ${b} > ${c})`, a > b || b > c, "or is True when at least one side is True."),
      q(`print(not ${a} > ${b})`, !(a > b), "not flips True to False and False to True."),
      q(`print(${a} != ${b})`, a !== b, "!= means \"not equal to\"."),
    ]);
  },

  "Dictionaries",
  () => {
    const ages = NAMES.slice(0, 3).map((n) => [n, rand(18, 60)]);
    const d = "{" + ages.map(([n, a]) => `"${n}": ${a}`).join(", ") + "}";
    const [name, age] = pick(ages);
    return pick([
      q(`ages = ${d}\nprint(ages["${name}"])`, age, "Square brackets with a key return the value stored under that key."),
      q(`ages = ${d}\nages["${name}"] += 1\nprint(ages["${name}"])`, age + 1, "+= 1 adds one to the value stored under that key."),
      q(`ages = ${d}\nages["Eva"] = 30\nprint(len(ages))`, 4, "Assigning to a new key adds a pair, and len() counts the pairs."),
    ]);
  },
  "Functions: reading",
  () => {
    const x = rand(2, 9), y = rand(2, 5);
    const def = "def double_plus(x, y=1):\n    return x * 2 + y\n\n";
    return pick([
      q(def + `print(double_plus(${x}))`, x * 2 + 1, "y was not given, so it takes its default value of 1."),
      q(def + `print(double_plus(${x}, ${y}))`, x * 2 + y, "The second argument replaces the default value of y."),
    ]);
  },

  "pandas",
  () => {
    const { setup } = frame();
    return pick([
      q(setup + `print(df.shape)`, "(4, 2)", "shape is (rows, columns)."),
      q(setup + `print(len(df))`, 4, "len() of a DataFrame counts the rows."),
      q(setup + `print(df.columns.tolist())`, ["city", "sales"], "columns holds the column names."),
    ]);
  },
  () => {
    const { sales, setup } = frame();
    return pick([
      q(setup + `print(df["sales"].sum())`, add(sales), ".sum() adds all the values in the column."),
      q(setup + `print(df["sales"].max())`, Math.max(...sales), ".max() returns the largest value in the column."),
      q(setup + `print(df["sales"].min())`, Math.min(...sales), ".min() returns the smallest value in the column."),
      q(setup + `print(df["sales"].mean())`, pyFloat(add(sales) / 4), ".mean() is the sum divided by the number of rows. It is always a float."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), i = rand(0, 3);
    return pick([
      q(setup + `print(df.loc[${i}, "sales"])`, sales[i], ".loc[row, column] uses the row label, and the labels here are 0 to 3."),
      q(setup + `print(df.iloc[${i}, 0])`, city[i], ".iloc[row, column] uses positions, and column 0 is city."),
      q(setup + `print(df["sales"].iloc[-1])`, sales[3], ".iloc[-1] is the last row."),
    ]);
  },
  () => {
    const { sales, setup } = frame(), k = pick(sales);
    const n = sales.filter((x) => x > k).length;
    return pick([
      q(setup + `print(len(df[df["sales"] > ${k}]))`, n, "The condition keeps only the rows where it is True. > does not include equal values."),
      q(setup + `print((df["sales"] > ${k}).sum())`, n, "The comparison gives True or False per row, and True counts as 1 in a sum."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), c = pick(city), k = pick(sales);
    return pick([
      q(setup + `print(df[df["city"] == "${c}"]["sales"].tolist())`, sales.filter((_, i) => city[i] === c),
        "The condition keeps the matching rows, then [\"sales\"] takes that column from them."),
      q(setup + `print(df.loc[df["sales"] >= ${k}, "city"].tolist())`, city.filter((_, i) => sales[i] >= k),
        ".loc[condition, column] filters the rows and selects the column in one step."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), c = pick(city);
    const group = sales.filter((_, i) => city[i] === c);
    return pick([
      q(setup + `print(df.groupby("city")["sales"].sum()["${c}"])`, add(group), "groupby splits the rows by city, then .sum() adds the sales within each city."),
      q(setup + `print(df.groupby("city")["sales"].max()["${c}"])`, Math.max(...group), "groupby splits the rows by city, then .max() takes the largest sale in each city."),
      q(setup + `print(df.groupby("city").size()["${c}"])`, group.length, ".size() counts the rows in each group."),
    ]);
  },
  () => {
    const { city, setup } = frame(), c = pick(city);
    const unique = [...new Set(city)];
    return pick([
      q(setup + `print(df["city"].value_counts()["${c}"])`, city.filter((x) => x === c).length, ".value_counts() counts how many times each value appears."),
      q(setup + `print(df["city"].nunique())`, unique.length, ".nunique() counts the distinct values."),
      q(setup + `print(df["city"].unique().tolist())`, unique, ".unique() lists each value once, in order of first appearance."),
    ]);
  },
  () => {
    const { sales, setup } = frame(), k = pick(sales);
    return pick([
      q(setup + `df["double"] = df["sales"] * 2\nprint(df["double"].tolist())`, sales.map((x) => x * 2), "Arithmetic on a column applies to every row."),
      q(setup + `df["big"] = df["sales"] > ${k}\nprint(df["big"].tolist())`, sales.map((x) => x > k), "A comparison on a column gives True or False for each row."),
      q(setup + `df["sales"] = df["sales"] + 1\nprint(df["sales"].sum())`, add(sales) + 4, "Adding 1 to the column adds 1 to each of the 4 rows."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame();
    const order = [0, 1, 2, 3].sort((a, b) => sales[a] - sales[b]);
    return pick([
      q(setup + `print(df.sort_values("sales")["city"].tolist())`, order.map((i) => city[i]), "sort_values orders the rows from smallest to largest sales."),
      q(setup + `print(df.sort_values("sales", ascending=False)["sales"].tolist())`, order.map((i) => sales[i]).reverse(), "ascending=False puts the largest value first."),
      q(setup + `print(df.sort_values("sales")["city"].iloc[0])`, city[order[0]], "After sorting, .iloc[0] is the row with the smallest sales."),
    ]);
  },
  () => {
    const { city, sales } = frame(), gap = rand(0, 3);
    const setup = frameCode(city, sales.map((x, i) => (i === gap ? null : x)));
    return pick([
      q(setup + `print(df["sales"].isna().sum())`, 1, "None becomes a missing value (NaN), and .isna().sum() counts them."),
      q(setup + `print(df.dropna().shape)`, "(3, 2)", ".dropna() removes every row that has a missing value."),
      q(setup + `print(df["sales"].fillna(0).sum())`, pyFloat(add(sales) - sales[gap]), "A column with a missing value is stored as floats, so the sum is a float."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), n = rand(1, 3);
    return pick([
      q(setup + `print(df.head(${n})["sales"].tolist())`, sales.slice(0, n), `.head(${n}) keeps the first ${n} row(s).`),
      q(setup + `print(df.tail(${n})["city"].tolist())`, city.slice(-n), `.tail(${n}) keeps the last ${n} row(s).`),
    ]);
  },
  () => {
    const { city, setup } = frame();
    return pick([
      q(setup + `print(df["city"].str.upper().tolist())`, city.map((c) => c.toUpperCase()), ".str applies a string method to every value in the column."),
      q(setup + `print(df["city"].str.len().tolist())`, city.map((c) => c.length), ".str.len() gives the number of characters in each value."),
    ]);
  },
  "NumPy",
  () => {
    const { setup } = matrix();
    return pick([
      q(setup + `print(m.shape)`, "(2, 3)", "shape is (rows, columns)."),
      q(setup + `print(m.size)`, 6, ".size is the total number of values: 2 rows times 3 columns."),
      q(setup + `print(m.ndim)`, 2, ".ndim is the number of dimensions. Rows and columns make 2."),
      q(setup + `print(len(m))`, 2, "len() of a 2D array counts the rows."),
    ]);
  },
  () => {
    const { m, setup } = matrix(), r = rand(0, 1), c = rand(0, 2);
    return pick([
      q(setup + `print(m[${r}, ${c}])`, m[r][c], "m[row, column], and both start at 0."),
      q(setup + `print(m[${r}].tolist())`, m[r], "A single index selects a whole row."),
      q(setup + `print(m[:, ${c}].tolist())`, [m[0][c], m[1][c]], `: means every row, so this is column ${c}.`),
    ]);
  },
  () => {
    const { m, setup } = matrix();
    return pick([
      q(setup + `print(m.sum())`, add(m[0]) + add(m[1]), ".sum() with no axis adds every value."),
      q(setup + `print(m.sum(axis=0).tolist())`, m[0].map((x, i) => x + m[1][i]), "axis=0 adds down the rows, giving one total per column."),
      q(setup + `print(m.sum(axis=1).tolist())`, m.map(add), "axis=1 adds across the columns, giving one total per row."),
    ]);
  },
  () => {
    const a = nums(3, 1, 9), b = nums(3, 1, 9), k = rand(2, 4);
    const setup = NP + `a = np.array(${src(a)})\n`;
    return pick([
      q(setup + `print((a * ${k}).tolist())`, a.map((x) => x * k), "Arithmetic on an array applies to every value."),
      q(setup + `print((a ** 2).tolist())`, a.map((x) => x * x), "** 2 squares every value."),
      q(setup + `b = np.array(${src(b)})\nprint((a + b).tolist())`, a.map((x, i) => x + b[i]), "Adding two arrays adds them position by position."),
      q(setup + `print((a / 2).tolist())`, floats(a.map((x) => x / 2)), "/ always gives floats, and it divides every value."),
      q(`a = ${src(a)}\nprint(a * 2)`, [...a, ...a], "This is a plain list, so * 2 repeats it. Only NumPy arrays multiply each value."),
    ]);
  },
  () => {
    const a = distinct(4, 1, 20), setup = NP + `a = np.array(${src(a)})\n`;
    return pick([
      q(setup + `print(a.sum())`, add(a), ".sum() adds all the values."),
      q(setup + `print(a.max())`, Math.max(...a), ".max() returns the largest value."),
      q(setup + `print(a.mean())`, pyFloat(add(a) / 4), ".mean() is the sum divided by the number of values. It is always a float."),
      q(setup + `print(a.argmax())`, a.indexOf(Math.max(...a)), ".argmax() returns the position of the largest value, not the value."),
    ]);
  },
  () => {
    const a = distinct(5, 1, 20), k = pick(a), setup = NP + `a = np.array(${src(a)})\n`;
    return pick([
      q(setup + `print(a[a > ${k}].tolist())`, a.filter((x) => x > k), "A condition inside [ ] keeps only the values where it is True."),
      q(setup + `print((a > ${k}).sum())`, a.filter((x) => x > k).length, "The comparison gives True or False per value, and True counts as 1 in a sum."),
      q(setup + `print(np.where(a > ${k}, 1, 0).tolist())`, a.map((x) => (x > k ? 1 : 0)), "np.where(condition, a, b) gives a where the condition is True and b elsewhere."),
    ]);
  },
  () => {
    const a = nums(5), i = rand(0, 4), s = rand(0, 2), e = rand(s + 1, 4);
    const setup = NP + `a = np.array(${src(a)})\n`;
    return pick([
      q(setup + `print(a[${i}])`, a[i], "Array indexes start at 0, like lists."),
      q(setup + `print(a[-1])`, a[4], "-1 is the last value."),
      q(setup + `print(a[${s}:${e}].tolist())`, a.slice(s, e), "A slice [a:b] starts at index a and stops before index b."),
      q(setup + `print(a[::2].tolist())`, a.filter((_, j) => j % 2 === 0), "[::2] takes every second value, starting from index 0."),
    ]);
  },
  () => {
    const n = rand(3, 5), lo = rand(1, 3), hi = lo + rand(5, 8), end = pick([1, 2, 10]);
    const stepped = [];
    for (let i = lo; i < hi; i += 2) stepped.push(i);
    return pick([
      q(NP + `print(np.arange(${n}).tolist())`, Array.from({ length: n }, (_, i) => i), "np.arange(n) goes from 0 to n - 1, like range(n)."),
      q(NP + `print(np.arange(${lo}, ${hi}, 2).tolist())`, stepped, "np.arange(start, stop, step) stops before stop."),
      q(NP + `print(np.zeros(${n}).tolist())`, floats(Array(n).fill(0)), "np.zeros makes floats by default, so each value is 0.0."),
      q(NP + `print(np.ones(${n}).sum())`, `${n}.0`, "np.ones makes floats by default, so the sum is a float."),
      q(NP + `print(np.linspace(0, ${end}, 5).tolist())`, floats([0, 1, 2, 3, 4].map((i) => (i * end) / 4)),
        "np.linspace(start, stop, n) gives n evenly spaced values and includes the stop."),
    ]);
  },
  () => {
    const setup = NP + `a = np.arange(6).reshape(2, 3)\n`, r = rand(0, 1), c = rand(0, 2);
    return pick([
      q(setup + `print(a.shape)`, "(2, 3)", "reshape(2, 3) arranges the 6 values into 2 rows and 3 columns."),
      q(setup + `print(a[${r}, ${c}])`, r * 3 + c, "The values 0 to 5 fill the array row by row."),
      q(setup + `print(a.tolist())`, [[0, 1, 2], [3, 4, 5]], "The values 0 to 5 fill the array row by row."),
      q(NP + `print(np.array([1, 2.5]).tolist())`, "[1.0, 2.5]", "An array holds one type, so the integer becomes a float."),
    ]);
  },

  "Functions: reading",
  () => {
    const x = rand(2, 9);
    return q(`def double(x):\n    x * 2\n\nprint(double(${x}))`, "None", "There is no return, so the function gives back None.");
  },
  () => {
    const x = rand(2, 9), def = `x = ${x}\n\ndef add_one(x):\n    x = x + 1\n    return x\n\n`;
    return pick([
      q(def + `add_one(x)\nprint(x)`, x, "The x inside the function is a separate variable, and the returned value was never saved."),
      q(def + `x = add_one(x)\nprint(x)`, x + 1, "The returned value is saved back into x."),
    ]);
  },
  () => {
    const a = rand(10, 20), b = rand(1, 9), def = "def subtract(a, b):\n    return a - b\n\n";
    return pick([
      q(def + `print(subtract(b=${b}, a=${a}))`, a - b, "Keyword arguments are matched by name, so their order does not matter."),
      q(def + `print(subtract(${b}, ${a}))`, b - a, "Positional arguments are matched by order, so a gets the first value."),
    ]);
  },
  () => {
    const xs = distinct(4);
    return q(`def low_high(xs):\n    return min(xs), max(xs)\n\nlow, high = low_high(${src(xs)})\nprint(high - low)`,
      Math.max(...xs) - Math.min(...xs), "The function returns two values, and low, high = ... stores them in order.");
  },
  () => {
    const x = rand(1, 9), def = "def double(x):\n    return x * 2\n\ndef add_three(x):\n    return x + 3\n\n";
    return pick([
      q(def + `print(double(add_three(${x})))`, (x + 3) * 2, "The inner call runs first, and its result goes into the outer function."),
      q(def + `print(add_three(double(${x})))`, x * 2 + 3, "The inner call runs first, and its result goes into the outer function."),
    ]);
  },
  () => {
    const s = rand(70, 99);
    return q(`def grade(score):\n    if score >= 90:\n        return "A"\n    if score >= 80:\n        return "B"\n    return "C"\n\nprint(grade(${s}))`,
      s >= 90 ? "A" : s >= 80 ? "B" : "C", "return ends the function, so only the first matching if matters.");
  },
  () => {
    const xs = nums(4), even = xs.find((x) => x % 2 === 0);
    return q(`def first_even(xs):\n    for x in xs:\n        if x % 2 == 0:\n            return x\n    return None\n\nprint(first_even(${src(xs)}))`,
      even === undefined ? "None" : even, "return ends the function at the first even number. With no even number, the last line returns None.");
  },
  () => {
    const x = rand(2, 9), y = rand(2, 9);
    return pick([
      q(`square = lambda x: x ** 2\nprint(square(${x}))`, x * x, "A lambda is a one-line function: the part after the colon is what it returns."),
      q(`add = lambda a, b: a + b\nprint(add(${x}, ${y}))`, x + y, "A lambda is a one-line function: the part after the colon is what it returns."),
    ]);
  },
  () => {
    const xs = nums(3);
    return q(`def add_item(xs):\n    xs.append(0)\n\nvalues = ${src(xs)}\nadd_item(values)\nprint(len(values))`, 4,
      "The function receives the same list, not a copy, so append changes the original.");
  },
  () => {
    const xs = nums(3, 1, 6);
    return q(`def square(x):\n    return x * x\n\ntotal = 0\nfor n in ${src(xs)}:\n    total += square(n)\nprint(total)`,
      add(xs.map((x) => x * x)), "The function is called once per item, and each result is added to total.");
  },

  "Functions: writing",
  () => {
    const w = rand(2, 9), h = rand(2, 9);
    return fb("def area(width, height):\n    ____ width * height", `area(${w}, ${h})`, w * h, ["return"],
      "return sends the result back to the caller. Without it the function gives back None.");
  },
  () => {
    const x = rand(2, 9);
    return pick([
      fb("____ double(x):\n    return x * 2", `double(${x})`, x * 2, ["def"], "A function definition starts with def."),
      fb("def double(x)____\n    return x * 2", `double(${x})`, x * 2, [":"], "The def line ends with a colon, and the body is indented below it."),
      fb("def triple(____):\n    return n * 3", `triple(${x})`, x * 3, ["n"], "The parameter name must match the name used in the body."),
    ]);
  },
  () => {
    const a = rand(2, 9), b = rand(2, 9);
    return fb("def add(a, b):\n    return a + b", `add(${a}, ____)`, a + b, [String(b)],
      `a is ${a}, so b must be ${a + b} - ${a}.`);
  },
  () => {
    const x = rand(2, 5), n = rand(2, 3);
    return fb("def power(x, n=____):\n    return x ** n", `power(${x})`, x ** n, [String(n)],
      "The call gives no n, so the default value is used.");
  },
  () => {
    const w = pick(WORDS);
    return fb("def shout(text):\n    return text.upper()", `____("${w}")`, w.toUpperCase(), ["shout"],
      "You call a function with its name followed by parentheses.");
  },
  () => {
    const n = rand(1, 9) * 2;
    return fb("def is_even(n):\n    return n % 2 ____ 0", `is_even(${n})`, true, ["=="],
      "== compares two values. A single = would be an assignment.");
  },
  () => {
    const xs = nums(4);
    return pick([
      fb("def average(xs):\n    return ____ / len(xs)", `average(${src(xs)})`, pyFloat(add(xs) / 4), ["sum(xs)"], "The average is the sum of the items divided by how many there are."),
      fb("def largest(xs):\n    return ____(xs)", `largest(${src(xs)})`, Math.max(...xs), ["max"], "max() returns the largest item in a list."),
    ]);
  },
  () => {
    const name = pick(NAMES);
    return fb('def greet(name, greeting):\n    return greeting + ", " + name', `greet("${name}", ____="Hi")`, `Hi, ${name}`, ["greeting"],
      "A keyword argument uses the parameter name from the def line.");
  },
  () => {
    const p = rand(2, 9), n = rand(2, 5);
    return fb("def total_price(price, quantity):\n    total = price * quantity\n    return ____", `total_price(${p}, ${n})`, p * n,
      ["total", "price * quantity", "quantity * price"], "The function has to return the value it computed.");
  },

  "Lists",
  () => {
    const xs = nums(4), setup = `xs = ${src(xs)}\n`;
    return pick([
      q(setup + `print(xs.pop())`, xs[3], ".pop() removes the last item and returns it."),
      q(setup + `xs.pop()\nprint(xs)`, xs.slice(0, 3), ".pop() removes the last item from the list."),
      q(setup + `xs.pop(0)\nprint(xs)`, xs.slice(1), ".pop(0) removes the item at index 0."),
    ]);
  },
  () => {
    const xs = nums(3), v = rand(30, 50), i = rand(0, 2);
    const inserted = [...xs];
    inserted.splice(i, 0, v);
    const [a, b, c] = distinct(3);
    return pick([
      q(`xs = ${src(xs)}\nxs.insert(${i}, ${v})\nprint(xs)`, inserted, ".insert(i, value) puts the value at index i and shifts the rest to the right."),
      q(`xs = ${src([a, b, a, c])}\nxs.remove(${a})\nprint(xs)`, [b, a, c], ".remove(value) deletes only the first match."),
    ]);
  },
  () => {
    const xs = nums(2), ys = nums(2), setup = `xs = ${src(xs)}\n`;
    return pick([
      q(setup + `xs.append(${src(ys)})\nprint(len(xs))`, 3, ".append() adds its argument as one item, so the inner list counts once."),
      q(setup + `xs.extend(${src(ys)})\nprint(len(xs))`, 4, ".extend() adds each item of the other list separately."),
      q(setup + `ys = ${src(ys)}\nprint(xs + ys)`, [...xs, ...ys], "+ joins two lists into a new list."),
    ]);
  },
  () => {
    const [a, b, c] = distinct(3), setup = `xs = ${src([a, b, a, c, a])}\n`;
    return pick([
      q(setup + `print(xs.count(${a}))`, 3, ".count(value) counts how many times the value appears."),
      q(setup + `print(xs.index(${c}))`, 3, ".index(value) returns the position of the value."),
      q(setup + `print(xs.index(${a}))`, 0, ".index(value) returns the position of the first match."),
    ]);
  },
  () => {
    const xs = distinct(4), setup = `xs = ${src(xs)}\n`;
    const sorted = [...xs].sort((a, b) => a - b);
    return pick([
      q(setup + `xs.sort()\nprint(xs)`, sorted, ".sort() reorders the list itself, from smallest to largest."),
      q(setup + `print(xs.sort())`, "None", ".sort() changes the list in place and returns None. Use sorted(xs) to get a new list."),
      q(setup + `xs.sort(reverse=True)\nprint(xs[0])`, sorted[3], "reverse=True sorts from largest to smallest."),
      q(setup + `xs.reverse()\nprint(xs)`, [...xs].reverse(), ".reverse() flips the order. It does not sort."),
    ]);
  },
  () => {
    const xs = nums(3), setup = `xs = ${src(xs)}\n`;
    return pick([
      q(setup + `ys = xs\nys.append(0)\nprint(len(xs))`, 4, "ys = xs gives the same list a second name, so the change shows in both."),
      q(setup + `ys = xs.copy()\nys.append(0)\nprint(len(xs))`, 3, ".copy() makes a separate list, so xs does not change."),
    ]);
  },

  "Strings",
  () => {
    const x = decimal(3);
    return pick([
      q(`x = ${x}\nprint(f"{x:.2f}")`, Number(x).toFixed(2), ":.2f rounds to 2 decimal places."),
      q(`x = ${x}\nprint(f"{x:.1f}")`, Number(x).toFixed(1), ":.1f rounds to 1 decimal place."),
      q(`x = ${x}\nprint(f"{x:.0f}")`, Number(x).toFixed(0), ":.0f rounds to a whole number and shows no decimal point."),
    ]);
  },
  () => {
    const n = rand(1000, 9999999), k = rand(11, 989);
    return pick([
      q(`n = ${n}\nprint(f"{n:,}")`, n.toLocaleString("en-US"), ":, adds a comma between every three digits."),
      q(`p = 0.${String(k).padStart(3, "0")}\nprint(f"{p:.1%}")`, (k / 10).toFixed(1) + "%", ":.1% multiplies by 100, keeps 1 decimal place and adds the % sign."),
    ]);
  },
  () => {
    const n = rand(1, 99);
    return pick([
      q(`n = ${n}\nprint(f"{n:03d}")`, String(n).padStart(3, "0"), ":03d pads the number with zeros until it has 3 digits."),
      q(`print(str(${n}).zfill(4))`, String(n).padStart(4, "0"), ".zfill(4) adds zeros on the left until the string has 4 characters."),
    ]);
  },
  () => {
    const name = pick(NAMES), n = rand(50, 99), a = rand(2, 9), b = rand(2, 9);
    return pick([
      q(`print("{} scored {}".format("${name}", ${n}))`, `${name} scored ${n}`, ".format() fills each {} in order."),
      q(`a = ${a}\nb = ${b}\nprint(f"{a} + {b} = {a + b}")`, `${a} + ${b} = ${a + b}`, "Each { } is replaced by the value of the code inside it."),
      q(`name = "${name}"\nprint(f"{name.upper()}!")`, `${name.toUpperCase()}!`, "An f-string can call a method inside the braces."),
      q(`print("%d items" % ${n})`, `${n} items`, "This is the older % style, where %d is replaced by the number."),
    ]);
  },
  () => {
    const x = decimal(2);
    return pick([
      q(`print(round(${x}, 1))`, pyFloat(Number(Number(x).toFixed(1))), "round(x, 1) keeps 1 decimal place."),
      q(`print(round(${x}))`, Math.round(Number(x)), "round() with one argument gives the nearest whole number, as an int."),
      q(`price = ${x}\nprint(f"Total: {price * 2:.2f}")`, `Total: ${(Number(x) * 2).toFixed(2)}`, "The braces can hold a calculation, and :.2f then shows it with 2 decimal places."),
    ]);
  },

  "pandas merge",
  () => {
    const { setup, matched, unused } = tables();
    const merge = (how) => setup + `merged = students.merge(courses, on="course_id"${how})\nprint(len(merged))`;
    return pick([
      q(merge(""), matched, "The default is an inner merge: it keeps only rows whose course_id appears in both tables."),
      q(merge(', how="left"'), 4, "A left merge keeps every row of the left table, matched or not."),
      q(merge(', how="right"'), matched + unused, "A right merge keeps every course. A course appears once per student in it, or once if it has none."),
      q(merge(', how="outer"'), 4 + unused, "An outer merge keeps every row from both tables."),
    ]);
  },
  () => {
    const { setup, matched } = tables();
    return pick([
      q(setup + `merged = students.merge(courses, on="course_id")\nprint(merged.columns.tolist())`, ["name", "course_id", "title"],
        "The key column appears once, followed by the other columns of the right table."),
      q(setup + `merged = students.merge(courses, on="course_id")\nprint(merged.shape)`, `(${matched}, 3)`,
        "An inner merge keeps the students whose course_id exists in courses, and adds the title column."),
      q(setup + `merged = students.merge(courses, on="course_id", how="left")\nprint(merged["title"].isna().sum())`, 4 - matched,
        "In a left merge, students whose course_id has no match get a missing title."),
    ]);
  },
  () => {
    const { names, ids, courseIds, titles, setup } = tables(), i = rand(0, 1);
    const merged = setup + `merged = pd.merge(students, courses, on="course_id")\n`;
    return pick([
      q(merged + `print(merged.loc[merged["name"] == "${names[i]}", "title"].tolist())`, [titles[i]],
        `${names[i]} has course_id ${ids[i]}, and the merge brings in the title with the same course_id.`),
      q(merged + `print((merged["title"] == "Stats").sum())`, ids.filter((x) => x === 1).length,
        "Stats has course_id 1, and every student with that course_id gets a row."),
      q(merged + `print(merged["name"].tolist())`, names.filter((_, j) => courseIds.includes(ids[j])),
        "pd.merge(a, b) is the same as a.merge(b). The inner merge drops students with no matching course."),
    ]);
  },
  () => {
    const [a1, a2, b1, b2] = nums(4, 50, 99);
    const scores = `import pandas as pd\nmidterm = pd.DataFrame({"id": [1, 2], "score": [${a1}, ${a2}]})\nfinal = pd.DataFrame({"id": [1, 2], "score": [${b1}, ${b2}]})\nmerged = midterm.merge(final, on="id")\n`;
    const keys = `import pandas as pd\nstudents = pd.DataFrame({"name": ["Ana", "Ben"], "course_id": [1, 2]})\ncourses = pd.DataFrame({"id": [1, 2], "title": ["Stats", "Python"]})\nmerged = students.merge(courses, left_on="course_id", right_on="id")\n`;
    return pick([
      q(scores + `print(merged.columns.tolist())`, ["id", "score_x", "score_y"], "A column name that exists in both tables gets _x (left table) and _y (right table)."),
      q(scores + `print(merged.loc[0, "score_y"])`, b1, "score_y comes from the right table, which is final."),
      q(keys + `print(merged.columns.tolist())`, ["name", "course_id", "id", "title"], "With left_on and right_on, both key columns are kept."),
    ]);
  },

  "Matplotlib",
  () => {
    const r = rand(2, 3), c = rand(2, 4), n = rand(3, 6), values = nums(8);
    return pick([
      q(PLT + `fig, axes = plt.subplots(${r}, ${c})\nprint(axes.shape)`, `(${r}, ${c})`, "plt.subplots(rows, columns) returns a grid of axes with that shape."),
      q(PLT + `fig, axes = plt.subplots(1, ${c})\nprint(len(axes))`, c, "One row of plots gives one axes per column."),
      q(PLT + `x = [1, 2, 3]\nplt.plot(x, [1, 4, 9])\nplt.plot(x, [2, 3, 5])\nprint(len(plt.gca().lines))`, 2, "Each plt.plot call adds one line to the same axes."),
      q(PLT + `counts, edges, _ = plt.hist(${src(values)}, bins=${n})\nprint(len(edges))`, n + 1, "n bins need n + 1 edges."),
      q(PLT + `counts, edges, _ = plt.hist(${src(values)}, bins=${n})\nprint(counts.sum())`, "8.0", "Every value falls in one bin, so the counts add up to the number of values."),
      q(PLT + `bars = plt.bar(["Rio", "Lima", "Quito"], ${src(nums(3))})\nprint(len(bars))`, 3, "plt.bar draws one bar per category."),
    ]);
  },
  () => pick([
    fv(XY + `plt.____(x, y)  # scatter plot`, ["scatter"], "plt.scatter draws one point per (x, y) pair.", "assert len(plt.gca().collections) == 1"),
    fv(XY + `plt.____(x, y)  # line plot`, ["plot"], "plt.plot connects the points with a line.", "assert len(plt.gca().lines) == 1"),
    fv(PLT + `cities = ["Rio", "Lima", "Quito"]\nsales = ${src(nums(3))}\nplt.____(cities, sales)  # bar chart`, ["bar"], "plt.bar draws one bar per category.", "assert len(plt.gca().patches) == 3"),
    fv(PLT + `values = ${src(nums(8))}\nplt.____(values, bins=5)  # histogram`, ["hist"], "plt.hist groups the values into bins and draws one bar per bin.", "assert len(plt.gca().patches) == 5"),
  ]),
  () => pick([
    fv(XY + `plt.plot(x, y)\nplt.____("Sales by year")  # text above the plot`, ["title"], "plt.title sets the text above the plot.", 'assert plt.gca().get_title() == "Sales by year"'),
    fv(XY + `plt.plot(x, y)\nplt.____("Year")  # label for the horizontal axis`, ["xlabel"], "plt.xlabel labels the horizontal axis.", 'assert plt.gca().get_xlabel() == "Year"'),
    fv(XY + `plt.plot(x, y)\nplt.____("Sales")  # label for the vertical axis`, ["ylabel"], "plt.ylabel labels the vertical axis.", 'assert plt.gca().get_ylabel() == "Sales"'),
    fv(XY + `plt.plot(x, y, label="2025")\nplt.____()  # show the box with the label`, ["legend"], "plt.legend shows the labels given to each plot call.", "assert plt.gca().get_legend() is not None"),
  ]),
  () => pick([
    fv(XY + `fig, ax = plt.____()  # one figure with one axes\nax.plot(x, y)`, ["subplots"], "plt.subplots() creates a figure and its axes together.", "assert len(ax.lines) == 1"),
    fv(XY + `fig, ax = plt.subplots()\nax.plot(x, y)\nax.____("Year")  # label for the horizontal axis`, ["set_xlabel"], "On an axes object the methods start with set_, so plt.xlabel becomes ax.set_xlabel.", 'assert ax.get_xlabel() == "Year"'),
    fv(XY + `fig, ax = plt.subplots()\nax.plot(x, y)\nax.____("Sales by year")  # text above the plot`, ["set_title"], "On an axes object the methods start with set_, so plt.title becomes ax.set_title.", 'assert ax.get_title() == "Sales by year"'),
  ]),
  () => pick([
    fv(XY + `plt.plot(x, y, ____="red")  # red line`, ["color", "c"], "The color argument sets the line colour. Matplotlib uses the American spelling.", 'assert plt.gca().lines[0].get_color() == "red"'),
    fv(XY + `plt.figure(____=(8, 4))  # 8 inches wide, 4 inches tall\nplt.plot(x, y)`, ["figsize"], "figsize is (width, height) in inches.", "assert plt.gcf().get_size_inches().tolist() == [8.0, 4.0]"),
    fv(XY + `plt.plot(x, y)\nplt.____("sales.png")  # save the figure as a file`, ["savefig"], "plt.savefig writes the current figure to a file.", 'import os\nassert os.path.exists("sales.png")'),
    fv(`import matplotlib.pyplot as ____\n\nplt.plot([1, 2, 3], [2, 4, 5])`, ["plt"], "plt is the standard short name for matplotlib.pyplot.", "assert len(plt.gca().lines) == 1"),
  ]),
  () => {
    const { setup } = frame();
    return pick([
      fv(setup + `df.plot(kind="____", x="city", y="sales")  # bar chart`, ["bar"], 'kind="bar" draws one bar per row.', "import matplotlib.pyplot as plt\nassert len(plt.gca().patches) == 4"),
      fv(setup + `df["sales"].plot(kind="____", bins=4)  # histogram`, ["hist"], 'kind="hist" draws a histogram of the column.', "import matplotlib.pyplot as plt\nassert len(plt.gca().patches) == 4"),
    ]);
  },

  "Dictionaries",
  () => {
    const { pairs, code } = agesDict(), [name, age] = pick(pairs);
    return pick([
      q(code + `print(ages.get("${name}", 0))`, age, ".get() returns the stored value when the key exists."),
      q(code + `print(ages.get("Eva", 0))`, 0, ".get(key, default) returns the default when the key is missing, instead of an error."),
      q(code + `print(ages.get("Eva"))`, "None", "With no default, .get() returns None for a missing key."),
    ]);
  },
  () => {
    const { pairs, code } = agesDict(), values = pairs.map((p) => p[1]);
    return pick([
      q(code + `print(list(ages.keys()))`, pairs.map((p) => p[0]), ".keys() gives the keys in the order they were added."),
      q(code + `print(sum(ages.values()))`, add(values), ".values() gives the stored values, and sum() adds them."),
      q(code + `print(max(ages.values()))`, Math.max(...values), ".values() gives the stored values, and max() picks the largest."),
      q(code + `print(max(ages, key=ages.get))`, pairs.find((p) => p[1] === Math.max(...values))[0],
        "max() goes through the keys, and key=ages.get compares them by their values."),
    ]);
  },
  () => {
    const { pairs, code } = agesDict(), [name, age] = pick(pairs);
    return pick([
      q(code + `print("${name}" in ages)`, true, "in checks the keys of a dictionary."),
      q(code + `print(${age} in ages)`, false, "in checks the keys, not the values."),
      q(code + `print(${age} in ages.values())`, true, "To search the values, use .values()."),
    ]);
  },
  () => {
    const { pairs, code } = agesDict(), values = pairs.map((p) => p[1]), t = pick(values);
    return pick([
      q(code + `total = 0\nfor name in ages:\n    total += ages[name]\nprint(total)`, add(values), "Looping over a dictionary gives its keys, and ages[name] looks up each value."),
      q(code + `count = 0\nfor name, age in ages.items():\n    if age > ${t}:\n        count += 1\nprint(count)`, values.filter((v) => v > t).length,
        ".items() gives each key together with its value. > does not include equal values."),
    ]);
  },
  () => {
    const { pairs, code } = agesDict(), [name, age] = pick(pairs);
    return pick([
      q(code + `print(ages.pop("${name}"))`, age, ".pop(key) removes the pair and returns its value."),
      q(code + `del ages["${name}"]\nprint(len(ages))`, 2, "del removes the whole pair."),
      q(code + `ages["${name}"] = 99\nprint(len(ages))`, 3, "The key already exists, so its value is replaced and no pair is added."),
    ]);
  },
  () => {
    const word = pick(["banana", "pandas", "letter", "coffee", "google"]), ch = pick([...word]);
    return q(`counts = {}\nfor ch in "${word}":\n    counts[ch] = counts.get(ch, 0) + 1\nprint(counts["${ch}"])`,
      [...word].filter((c) => c === ch).length, "counts.get(ch, 0) starts each new letter at 0, then 1 is added every time the letter appears.");
  },
  () => {
    const [a1, a2] = distinct(2, 18, 60), k = rand(3, 9), scores = nums(3, 50, 99), i = rand(0, 2);
    return pick([
      q(`people = {\n    "Ana": {"age": ${a1}, "city": "Rio"},\n    "Ben": {"age": ${a2}, "city": "Lima"},\n}\nprint(people["Ben"]["age"])`, a2,
        "The first key selects the inner dictionary, and the second key selects a value inside it."),
      q(`squares = {x: x ** 2 for x in [1, 2, ${k}]}\nprint(squares[${k}])`, k * k, "A dictionary comprehension builds key: value pairs, here each number and its square."),
      q(`squares = {x: x ** 2 for x in range(1, 4)}\nprint(squares)`, "{1: 1, 2: 4, 3: 9}", "A dictionary comprehension builds key: value pairs, here each number and its square."),
      q(`names = ["Ana", "Ben", "Caio"]\nscores = ${src(scores)}\ngrades = dict(zip(names, scores))\nprint(grades["${NAMES[i]}"])`, scores[i],
        "zip pairs the two lists item by item, and dict() turns each pair into key: value."),
      q(`data = {"scores": ${src(scores)}}\nprint(data["scores"][${i}])`, scores[i], "The key returns the list, and the index then selects one item from it."),
    ]);
  },

  "Loops and conditions",
  () => {
    const i = rand(0, 3), loop = (start) =>
      `for i, name in enumerate(${src(NAMES)}${start}):\n    if name == "${NAMES[i]}":\n        print(i)`;
    return pick([
      q(loop(""), i, "enumerate gives each item together with its position, starting at 0."),
      q(loop(", start=1"), i + 1, "start=1 makes enumerate count from 1 instead of 0."),
    ]);
  },
  () => {
    const xs = nums(3, 1, 6), ys = nums(3, 1, 6);
    return q(`total = 0\nfor a, b in zip(${src(xs)}, ${src(ys)}):\n    total += a * b\nprint(total)`,
      add(xs.map((x, i) => x * ys[i])), "zip pairs the lists item by item, so each a is multiplied by the b in the same position.");
  },
  () => {
    const xs = nums(5), k = rand(8, 14);
    const stop = xs.findIndex((x) => x > k);
    return pick([
      q(`total = 0\nfor x in ${src(xs)}:\n    if x > ${k}:\n        break\n    total += x\nprint(total)`, add(stop === -1 ? xs : xs.slice(0, stop)),
        "break ends the loop at the first item above the limit, so later items are never added."),
      q(`total = 0\nfor x in ${src(xs)}:\n    if x % 2 == 1:\n        continue\n    total += x\nprint(total)`, add(xs.filter((x) => x % 2 === 0)),
        "continue skips the rest of the body for odd numbers, so only even numbers are added."),
    ]);
  },
  () => {
    const a = rand(2, 4), b = rand(2, 4);
    return pick([
      q(`count = 0\nfor i in range(${a}):\n    for j in range(${b}):\n        count += 1\nprint(count)`, a * b, "The inner loop runs in full for every pass of the outer loop."),
      q(`count = 0\nfor i in range(${a + 1}):\n    for j in range(i):\n        count += 1\nprint(count)`, (a * (a + 1)) / 2, "The inner loop runs i times, and i goes 0, 1, 2 and so on."),
    ]);
  },
  () => {
    const xs = nums(4), k = rand(6, 14);
    return pick([
      q(`out = []\nfor x in ${src(xs)}:\n    out.append(x * 2)\nprint(out)`, xs.map((x) => x * 2), "Each pass appends one new value, so out ends with one item per input."),
      q(`out = []\nfor x in ${src(xs)}:\n    if x > ${k}:\n        out.append(x)\nprint(out)`, xs.filter((x) => x > k), "Only the items that pass the test are appended."),
      q(`xs = ${src(xs)}\nfor i in range(len(xs)):\n    xs[i] = xs[i] + 1\nprint(xs)`, xs.map((x) => x + 1), "range(len(xs)) gives every index, so each item is replaced in turn."),
    ]);
  },
  () => {
    const n = rand(3, 9), start = rand(8, 12), step = rand(2, 4);
    let last = start;
    for (let i = start; i > 0; i -= step) last = i;
    return pick([
      q(`for i in range(${n}):\n    pass\nprint(i)`, n - 1, `The loop variable keeps its last value, and range(${n}) ends at ${n - 1}.`),
      q(`for i in range(${start}, 0, -${step}):\n    last = i\nprint(last)`, last, "A negative step counts down, and the loop stops before it reaches 0."),
      q(`total = 0\nfor i in range(1, ${n}):\n    total += i\nprint(total)`, (n * (n - 1)) / 2, `range(1, ${n}) goes from 1 to ${n - 1}.`),
    ]);
  },
  () => {
    const xs = distinct(4), n = rand(10, 80);
    let m = n, steps = 0;
    while (m > 1) { m = Math.floor(m / 2); steps++; }
    return pick([
      q(`xs = ${src(xs)}\nbest = xs[0]\nfor x in xs:\n    if x > best:\n        best = x\nprint(best)`, Math.max(...xs), "best is replaced whenever a larger value appears, so it ends as the maximum."),
      q(`n = ${n}\nsteps = 0\nwhile n > 1:\n    n = n // 2\n    steps += 1\nprint(steps)`, steps, "The loop halves n, dropping the decimal part, until it reaches 1, and counts the passes."),
    ]);
  },
  () => {
    const w = pick(WORDS), ws = [pick(WORDS), pick(WORDS), pick(WORDS)];
    return pick([
      q(`count = 0\nfor ch in "${w}":\n    if ch in "aeiou":\n        count += 1\nprint(count)`, [...w].filter((c) => "aeiou".includes(c)).length,
        "The loop visits each character and counts the ones that are vowels."),
      q(`s = ""\nfor w in ${src(ws)}:\n    s += w[0]\nprint(s)`, ws.map((x) => x[0]).join(""), "Each pass adds the first letter of the next word to s."),
    ]);
  },

  "pandas groupby",
  () => {
    const { city, sales, setup } = frame(), g = groups(city, sales), c = pick(g.cities);
    const whole = g.cities.filter((x) => Number.isInteger((g.sum[x] / g.size[x]) * 2));
    const m = pick(whole);
    return pick([
      q(setup + `print(df.groupby("city")["sales"].mean()["${m}"])`, pyFloat(g.sum[m] / g.size[m]), "The mean is taken within each city. It is always a float."),
      q(setup + `print(df.groupby("city")["sales"].count()["${c}"])`, g.size[c], ".count() counts the rows in each group."),
      q(setup + `print(df.groupby("city")["sales"].min()["${c}"])`, Math.min(...g.rows[c]), ".min() takes the smallest sale within each city."),
      q(setup + `print(df.groupby("city")["sales"].first()["${c}"])`, g.rows[c][0], ".first() takes the first row of each group, in the original row order."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), g = groups(city, sales);
    return pick([
      q(setup + `print(df.groupby("city").ngroups)`, g.cities.length, "ngroups is the number of distinct values in the grouping column."),
      q(setup + `print(len(df.groupby("city")["sales"].sum()))`, g.cities.length, "The result has one row per group, not one per original row."),
      q(setup + `print(df.groupby("city")["sales"].sum().index.tolist())`, g.cities, "The group names become the index, sorted alphabetically."),
      q(setup + `print(df.groupby("city")["sales"].sum().tolist())`, g.cities.map((c) => g.sum[c]), "There is one total per city, in alphabetical order of the cities."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), g = groups(city, sales);
    const totals = g.cities.map((c) => g.sum[c]), top = Math.max(...totals);
    return pick([
      q(setup + `print(df.groupby("city")["sales"].sum().idxmax())`, g.cities[totals.indexOf(top)], ".idxmax() returns the index label of the largest value, here the city with the highest total."),
      q(setup + `print(df.groupby("city")["sales"].sum().max())`, top, "First the sales are added within each city, then .max() picks the largest total."),
      q(setup + `print(df.groupby("city").size().max())`, Math.max(...g.cities.map((c) => g.size[c])), ".size() counts the rows per city, then .max() picks the largest count."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), g = groups(city, sales), c = pick(g.cities);
    return pick([
      q(setup + `print(df.groupby("city")["sales"].agg(["min", "max"]).loc["${c}", "max"])`, Math.max(...g.rows[c]), ".agg with a list gives one column per function and one row per city."),
      q(setup + `print(df.groupby("city")["sales"].agg(["sum", "mean"]).shape)`, `(${g.cities.length}, 2)`, ".agg with a list gives one row per city and one column per function."),
      q(setup + `print(df.groupby("city")["sales"].sum().reset_index().columns.tolist())`, ["city", "sales"], ".reset_index() turns the group names back into an ordinary column."),
      q(setup + `print(df.groupby("city")["sales"].sum().reset_index().shape)`, `(${g.cities.length}, 2)`, "After .reset_index() there is one row per city and two columns."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), g = groups(city, sales);
    return pick([
      q(setup + `df["city_total"] = df.groupby("city")["sales"].transform("sum")\nprint(df["city_total"].tolist())`, city.map((c) => g.sum[c]),
        ".transform() returns one value per original row: each row gets the total of its own city."),
      q(setup + `print(df.groupby("city")["sales"].transform("count").tolist())`, city.map((c) => g.size[c]),
        ".transform() returns one value per original row: each row gets the number of rows in its city."),
    ]);
  },

  // ======== harder questions ========

  "Numbers and types", HARDER,
  () => {
    const a = rand(7, 19), b = rand(2, 5), c = rand(2, 4), d = rand(2, 3);
    return pick([
      q(`print(-${a} // ${b})`, Math.floor(-a / b), "// rounds down, and for a negative number down means further from zero."),
      q(`print((${a} + ${b}) // ${c} * ${d})`, Math.floor((a + b) / c) * d, "The brackets run first. Then // and * run from left to right."),
      q(`print(${a} % ${b} ** 2)`, a % (b * b), "** runs before %, so this is the remainder after dividing by the square."),
      q(`print(${a} // ${b} + ${a} % ${b})`, Math.floor(a / b) + (a % b), "// gives the whole part of the division and % gives the remainder."),
    ]);
  },
  () => {
    const a = rand(1, 9), b = rand(1, 9), c = rand(1, 9);
    return pick([
      q(`print(int("${a}" + "${b}") + ${c})`, a * 10 + b + c, "The strings are joined first, then int() turns the result into a number."),
      q(`print(str(${a}) * 2 + str(${b}))`, `${a}${a}${b}`, "str() makes text, so * repeats it and + joins it."),
      q(`print(0.1 + 0.2 == 0.3)`, false, "Floats are stored approximately, so 0.1 + 0.2 is slightly more than 0.3."),
      q(`print(bool(0), bool("0"))`, "False True", "0 counts as False, but any non-empty string counts as True, even \"0\"."),
      q(`print(${a} / ${a} == 1, type(${a} / ${a}) == int)`, "True False", "/ returns the float 1.0. It equals 1, but its type is float."),
    ]);
  },

  "Strings", HARDER,
  () => {
    const w = pick(WORDS), setup = `word = "${w}"\n`;
    return pick([
      q(setup + `print(word[::-1][:3])`, [...w].reverse().join("").slice(0, 3), "[::-1] reverses the string, then [:3] takes the first three characters of the result."),
      q(setup + `print(word[1:-1].upper())`, w.slice(1, -1).toUpperCase(), "[1:-1] drops the first and last characters, then .upper() capitalises the rest."),
      q(setup + `print("-".join(word[:3]))`, [...w.slice(0, 3)].join("-"), "A string is a sequence of characters, so .join puts the separator between them."),
      q(setup + `print(word.replace(word[0], "X"))`, w.replaceAll(w[0], "X"), ".replace swaps every copy of the first letter, wherever it appears."),
    ]);
  },
  () => {
    const ws = pick([["the", "quick", "brown", "fox"], ["data", "is", "never", "clean"], ["we", "love", "tidy", "tables"]]);
    const setup = `words = "${ws.join(" ")}".split()\n`;
    const shortest = ws.reduce((best, w) => (w.length < best.length ? w : best));
    const longest = ws.reduce((best, w) => (w.length > best.length ? w : best));
    return pick([
      q(setup + `print(words[1][0] + words[-1][-1])`, ws[1][0] + ws[3].slice(-1), "The first index picks a word and the second picks a character inside it."),
      q(setup + `print(sorted(words, key=len)[0])`, shortest, "key=len sorts by length. Words of the same length keep their original order."),
      q(setup + `print(max(words, key=len))`, longest, "max with key=len returns the longest word, and the first one if there is a tie."),
      q(setup + `print(" ".join(w.capitalize() for w in words))`, ws.map((w) => w[0].toUpperCase() + w.slice(1)).join(" "), "Each word is capitalised, then .join puts them back together with spaces."),
    ]);
  },
  () => {
    const name = pick(NAMES).toLowerCase();
    return bug([`name = "${name}"`, `greeting = "Hello, " + name.upper`, `print(greeting)`], 2,
      `greeting = "Hello, " + name.upper()`, `Hello, ${name.toUpperCase()}`, "Without the brackets, name.upper is the method itself and not its result.");
  },

  "Lists", HARDER,
  () => {
    const xs = distinct(4), setup = `xs = ${src(xs)}\n`;
    return pick([
      q(setup + `ys = xs[1:]\nys[0] = 99\nprint(xs[1])`, xs[1], "A slice is a copy, so changing ys does not change xs."),
      q(setup + `ys = xs\nys[0] = 99\nprint(xs[0])`, 99, "ys = xs is the same list under a second name."),
      q(setup + `print(sorted(xs)[-2])`, [...xs].sort((a, b) => a - b)[2], "sorted() orders the values, and [-2] is the second largest."),
      q(setup + `print(sum(xs[::2]))`, xs[0] + xs[2], "[::2] takes the items at indexes 0 and 2."),
      q(setup + `print([x for x in xs if x % 2 == 0][::-1])`, xs.filter((x) => x % 2 === 0).reverse(), "The comprehension keeps the even numbers, then [::-1] reverses them."),
    ]);
  },
  () => {
    const m = [nums(2, 1, 9), nums(2, 1, 9), nums(2, 1, 9)], setup = `m = ${src(m)}\n`;
    return pick([
      q(setup + `print(m[1][0] + m[2][1])`, m[1][0] + m[2][1], "m[row][column]: the first index picks the inner list and the second picks the item."),
      q(setup + `print(len(m), len(m[0]))`, "3 2", "len(m) counts the inner lists, and len(m[0]) counts the items in the first one."),
      q(setup + `print([row[0] for row in m])`, m.map((row) => row[0]), "Taking item 0 of every row gives the first column."),
      q(setup + `print(sum(x for row in m for x in row))`, add(m.map(add)), "The two for clauses visit every item of every row."),
    ]);
  },
  () => {
    const xs = nums(3);
    return bug([`xs = ${src(xs)}`, `total = 0`, `for i in range(1, len(xs)):`, `    total += xs[i]`, `print(total)`], 3,
      `for i in range(len(xs)):`, add(xs), "range(1, len(xs)) starts at index 1, so the first item is skipped.");
  },

  "Dictionaries", HARDER,
  () => {
    const a = nums(3, 50, 99);
    let b = nums(3, 50, 99);
    while (add(a) === add(b)) b = nums(3, 50, 99);
    const setup = `scores = {"Ana": ${src(a)}, "Ben": ${src(b)}}\n`;
    return pick([
      q(setup + `print(max(scores["Ana"]) - min(scores["Ben"]))`, Math.max(...a) - Math.min(...b), "Each key returns a list, so max and min work on the scores of one person."),
      q(setup + `print(sum(len(v) for v in scores.values()))`, 6, "Each value is a list of 3 scores, and there are 2 lists."),
      q(setup + `print(max(scores, key=lambda k: sum(scores[k])))`, add(a) > add(b) ? "Ana" : "Ben", "max goes through the keys and compares them by the total of their scores."),
      q(setup + `scores["Ana"].append(100)\nprint(len(scores["Ana"]))`, 4, "The key returns the list itself, so append changes the list stored in the dictionary."),
    ]);
  },
  () => {
    const { pairs, code } = agesDict(), byAge = [...pairs].sort((x, y) => x[1] - y[1]);
    const [name, age] = pick(pairs), t = byAge[1][1];
    return pick([
      q(code + `inverse = {age: name for name, age in ages.items()}\nprint(inverse[${age}])`, name, "The comprehension swaps keys and values, so an age now looks up a name."),
      q(code + `print(sorted(ages, key=ages.get)[0])`, byAge[0][0], "sorted goes through the keys and orders them by age, so [0] is the youngest."),
      q(code + `print(sorted(ages.values())[1])`, t, "The ages are sorted from smallest to largest, and [1] is the middle one of three."),
      q(code + `print([name for name, age in ages.items() if age >= ${t}])`, pairs.filter((p) => p[1] >= t).map((p) => p[0]), ".items() gives name and age together, and the if keeps the names that pass the test."),
    ]);
  },

  "Loops and conditions", HARDER,
  () => {
    const n = rand(8, 16), k = rand(4, 8), start = pick([3, 5, 6, 7, 10, 12]);
    let fizz = 0, a = 0, b = 1, m = start, steps = 0;
    for (let i = 1; i < n; i++) if (i % 3 === 0 || i % 5 === 0) fizz += i;
    for (let i = 0; i < k; i++) [a, b] = [b, a + b];
    while (m !== 1) { m = m % 2 === 0 ? m / 2 : 3 * m + 1; steps++; }
    return pick([
      q(`total = 0\nfor i in range(1, ${n}):\n    if i % 3 == 0 or i % 5 == 0:\n        total += i\nprint(total)`, fizz, "Only the multiples of 3 or 5 below the limit are added."),
      q(`a, b = 0, 1\nfor _ in range(${k}):\n    a, b = b, a + b\nprint(a)`, a, "Each pass moves b into a and puts their sum into b: 0, 1, 1, 2, 3, 5, 8 and so on."),
      q(`n = ${start}\nsteps = 0\nwhile n != 1:\n    if n % 2 == 0:\n        n = n // 2\n    else:\n        n = 3 * n + 1\n    steps += 1\nprint(steps)`, steps, "Even numbers are halved and odd numbers become 3n + 1, until n reaches 1."),
    ]);
  },
  () => {
    const xs = nums(4, 1, 9), k = rand(8, 12);
    let pairs = 0;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (xs[i] + xs[j] > k) pairs++;
    return pick([
      q(`xs = ${src(xs)}\ncount = 0\nfor i in range(len(xs)):\n    for j in range(i + 1, len(xs)):\n        if xs[i] + xs[j] > ${k}:\n            count += 1\nprint(count)`, pairs,
        "The inner loop starts at i + 1, so each pair of items is checked once."),
      q(`out = []\nfor i, x in enumerate(${src(xs)}):\n    if i % 2 == 0:\n        out.append(x)\nprint(out)`, [xs[0], xs[2]], "enumerate gives the position, and only the items at even positions are kept."),
    ]);
  },
  () => {
    const xs = nums(3);
    return bug([`xs = ${src(xs)}`, `total = 0`, `for x in xs:`, `    total = x`, `print(total)`], 4,
      `    total += x`, add(xs), "= replaces total on every pass. += adds to it.");
  },

  "Functions: reading", HARDER,
  () => {
    const n = rand(3, 5), x = rand(2, 5), xs = nums(3, 1, 9);
    return pick([
      q(`def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(${n}))`, [1, 1, 2, 6, 24, 120][n],
        "The function calls itself with a smaller n until n reaches 1, then multiplies on the way back."),
      q(`def add(x, items=[]):\n    items.append(x)\n    return len(items)\n\nadd(1)\nprint(add(2))`, 2, "The default list is created once and shared between calls, so it already holds 1."),
      q(`def total(*args):\n    return sum(args)\n\nprint(total(${xs.join(", ")}))`, add(xs), "*args collects all the positional arguments into a tuple."),
      q(`def apply_twice(f, x):\n    return f(f(x))\n\nprint(apply_twice(lambda v: v * 2, ${x}))`, x * 4, "The function is passed in as an argument and applied twice."),
    ]);
  },
  () => {
    const xs = nums(4, 1, 9), k = rand(4, 12), a = rand(2, 9), b = rand(2, 9);
    return pick([
      q(`def double(x):\n    return x * 2\n\nprint([double(x) for x in ${src(xs)} if double(x) > ${k}])`, xs.map((x) => x * 2).filter((x) => x > k), "Each item is doubled, and only the doubled values above the limit are kept."),
      q(`print(list(map(lambda x: x + 1, ${src(xs)})))`, xs.map((x) => x + 1), "map applies the function to every item."),
      q(`def outer(x):\n    def inner(y):\n        return x + y\n    return inner\n\nadd_n = outer(${a})\nprint(add_n(${b}))`, a + b, "outer returns the inner function, which remembers the value of x."),
    ]);
  },
  () => {
    const end = pick([0, -1]);
    return q(`words = ["pear", "fig", "banana", "kiwi"]\nprint(sorted(words, key=lambda w: len(w))[${end}])`, end === 0 ? "fig" : "banana",
      "The lambda returns the length of each word, so the list is sorted from shortest to longest.");
  },

  "Functions: writing", HARDER,
  () => {
    const xs = nums(4), limit = rand(6, 14), w = pick(WORDS);
    return pick([
      fb("def is_long(word):\n    return ____ > 5", `is_long("${w}")`, w.length > 5, ["len(word)"], "len(word) is the number of characters, which is then compared with 5."),
      fb("def last(xs):\n    return xs[____]", `last(${src(xs)})`, xs[3], ["-1", "len(xs) - 1"], "Index -1 is the last item."),
      fb("def count_big(xs, limit):\n    count = 0\n    for x in xs:\n        if x > limit:\n            count ____ 1\n    return count", `count_big(${src(xs)}, ${limit})`, xs.filter((x) => x > limit).length, ["+="], "+= 1 adds one to the counter."),
      fb("def evens(xs):\n    return [x for x in xs ____ x % 2 == 0]", `evens(${src(xs)})`, xs.filter((x) => x % 2 === 0), ["if"], "The if at the end of a comprehension filters the items."),
    ]);
  },
  () => {
    const xs = nums(4);
    return bug([`def average(xs):`, `    total = sum(xs)`, `    return total / len(x)`, ``, `print(average(${src(xs)}))`], 3,
      `    return total / len(xs)`, pyFloat(add(xs) / 4), "The parameter is called xs. There is no variable named x.");
  },
  () => {
    const name = pick(NAMES);
    return bug([`def greet(name):`, `    message = "Hi, " + name`, ``, `print(greet("${name}"))`], 2,
      `    return "Hi, " + name`, `Hi, ${name}`, "The function builds the message but never returns it, so the call gives None.");
  },

  "NumPy", HARDER,
  () => {
    const a = distinct(5, 1, 20), setup = NP + `a = np.array(${src(a)})\n`, mean = add(a) / 5;
    return pick([
      q(setup + `print(a[a > a.mean()].tolist())`, a.filter((x) => x > mean), "a.mean() is computed first, then the mask keeps the values above it."),
      q(setup + `print(a[a % 2 == 0].sum())`, add(a.filter((x) => x % 2 === 0)), "The mask keeps the even values and .sum() adds them. An empty selection sums to 0."),
      q(setup + `print(np.argsort(a).tolist())`, [0, 1, 2, 3, 4].sort((i, j) => a[i] - a[j]), "argsort returns the positions that would sort the array, smallest value first."),
      q(setup + `a[1:3] = 0\nprint(a.sum())`, a[0] + a[3] + a[4], "Assigning to a slice changes those positions in the array itself."),
    ]);
  },
  () => {
    const { m, setup } = matrix(), k = rand(3, 7);
    return pick([
      q(setup + `print((m + np.array([10, 20, 30])).tolist())`, m.map((row) => row.map((x, i) => x + 10 * (i + 1))), "The 1D array is added to every row. This is called broadcasting."),
      q(setup + `print(m[m > ${k}].size)`, m.flat().filter((x) => x > k).length, "A mask on a 2D array returns the matching values as a 1D array."),
      q(setup + `print(m.max(axis=1).tolist())`, m.map((row) => Math.max(...row)), "axis=1 works across the columns, giving the largest value in each row."),
      q(setup + `print(m.T.shape)`, "(3, 2)", ".T swaps rows and columns."),
      q(setup + `print(m.reshape(3, 2)[2].tolist())`, [m[1][1], m[1][2]], "reshape reads the six values row by row and regroups them in pairs."),
    ]);
  },

  "pandas", HARDER,
  () => {
    const { city, sales, setup } = frame(), k = pick(sales), c = pick(city), mean = add(sales) / 4;
    const order = [0, 1, 2, 3].sort((i, j) => sales[j] - sales[i]);
    return pick([
      q(setup + `print(df.loc[df["sales"].idxmax(), "city"])`, city[order[0]], ".idxmax() gives the row label of the largest sale, and .loc reads the city in that row."),
      q(setup + `print(df.sort_values("sales", ascending=False).head(2)["city"].tolist())`, [city[order[0]], city[order[1]]], "The rows are sorted from largest to smallest sales, and .head(2) keeps the top two."),
      q(setup + `print((df["sales"] > df["sales"].mean()).sum())`, sales.filter((x) => x > mean).length, "Each sale is compared with the mean, and True counts as 1 in the sum."),
      q(setup + `print(df[(df["sales"] >= ${k}) & (df["city"] == "${c}")].shape[0])`, sales.filter((x, i) => x >= k && city[i] === c).length, "& keeps the rows where both conditions are True. Each condition needs its own brackets."),
      q(setup + `print(df[df["sales"] > ${k}]["city"].nunique())`, new Set(city.filter((_, i) => sales[i] > k)).size, "The rows are filtered first, then .nunique() counts the distinct cities that remain."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), k = pick(sales);
    return pick([
      q(setup + `print(df["city"].isin(["Rio", "Lima"]).sum())`, city.filter((c) => c !== "Quito").length, ".isin() is True for rows whose city is in the list."),
      q(setup + `print(df["sales"].apply(lambda x: x * 2).max())`, Math.max(...sales) * 2, ".apply() runs the function on every value of the column."),
      q(setup + `df["rank"] = df["sales"].rank(ascending=False).astype(int)\nprint(df["rank"].tolist())`, sales.map((x) => sales.filter((y) => y > x).length + 1), "With ascending=False, the largest sale gets rank 1."),
      q(setup + `print(df.query("sales > ${k}")["sales"].tolist())`, sales.filter((x) => x > k), ".query() filters rows with a condition written as text."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), k = pick(sales);
    return bug([...setup.trim().split("\n"), `big = df[df["sales"] >= ${k} and df["city"] == "Rio"]`, `print(len(big))`], 6,
      `big = df[(df["sales"] >= ${k}) & (df["city"] == "Rio")]`, sales.filter((x, i) => x >= k && city[i] === "Rio").length,
      "pandas needs & instead of and, with each condition in its own brackets.");
  },

  "pandas groupby", HARDER,
  () => {
    const { city, sales, setup } = frame(), g = groups(city, sales), c = pick(g.cities);
    const repeated = sales.filter((_, i) => g.size[city[i]] > 1);
    return pick([
      q(setup + `print(df.groupby("city")["sales"].agg(lambda s: s.max() - s.min())["${c}"])`, Math.max(...g.rows[c]) - Math.min(...g.rows[c]), "The lambda runs once per city and returns the gap between its largest and smallest sale."),
      q(setup + `print(df[df.groupby("city")["sales"].transform("size") > 1].shape[0])`, repeated.length, "transform gives each row the size of its city, and the mask keeps rows from cities that appear more than once."),
      q(setup + `print(df.groupby("city").filter(lambda g: len(g) > 1)["sales"].sum())`, add(repeated), ".filter keeps whole groups that pass the test, here the cities with more than one row."),
    ]);
  },
  () => {
    const { city, sales, setup } = frame(), g = groups(city, sales), k = rand(8, 16);
    return pick([
      q(setup + `totals = df.groupby("city")["sales"].sum()\nprint(totals[totals > ${k}].index.tolist())`, g.cities.filter((c) => g.sum[c] > k), "The grouped totals are a Series, so they can be filtered like any column."),
      q(setup + `print(df.groupby("city")["sales"].max().min())`, Math.min(...g.cities.map((c) => Math.max(...g.rows[c]))), "First the largest sale of each city, then the smallest of those."),
      q(setup + `print(df.groupby("city")["sales"].count().sort_index(ascending=False).index[0])`, g.cities[g.cities.length - 1], "The index holds the city names, and sorting it in reverse puts the last one alphabetically first."),
    ]);
  },

  "pandas merge", HARDER,
  () => {
    const { names, ids, courseIds, setup, matched } = tables();
    const outer = setup + `merged = students.merge(courses, on="course_id", how="outer", indicator=True)\n`;
    return pick([
      q(setup + `merged = students.merge(courses, on="course_id")\nprint(merged.groupby("title")["name"].count()["Stats"])`, ids.filter((x) => x === 1).length, "After the merge each student row carries a title, so groupby can count students per course."),
      q(outer + `print((merged["_merge"] == "both").sum())`, matched, "indicator=True adds a _merge column that says whether each row was found in both tables or only one."),
      q(outer + `print((merged["_merge"] == "left_only").sum())`, 4 - matched, "left_only marks the students whose course_id is not in courses."),
      q(setup + `missing = students[~students["course_id"].isin(courses["course_id"])]\nprint(missing["name"].tolist())`, names.filter((_, i) => !courseIds.includes(ids[i])), "~ flips the mask, so this keeps the students whose course_id is not in courses."),
    ]);
  },
  () => bug([
    `import pandas as pd`,
    `students = pd.DataFrame({"name": ["Ana", "Ben"], "course_id": [1, 2]})`,
    `courses = pd.DataFrame({"id": [1, 2], "title": ["Stats", "Python"]})`,
    `merged = students.merge(courses, on="course_id")`,
    `print(merged["title"].tolist())`,
  ], 4, `merged = students.merge(courses, left_on="course_id", right_on="id")`, ["Stats", "Python"],
  "on= needs a column that exists in both tables. Here the key has a different name in each, so it needs left_on and right_on."),

  "Matplotlib", HARDER,
  () => pick([
    q(XY + `fig, axes = plt.subplots(2, 2)\naxes[0, 1].plot(x, y)\nprint(len(axes[0, 1].lines) + len(axes[1, 0].lines))`, 1, "Only the axes in row 0, column 1 received a line."),
    q(PLT + `fig, axes = plt.subplots(2, 3)\nprint(len(fig.axes))`, 6, "A 2 by 3 grid holds 6 axes."),
    q(XY + `fig, ax = plt.subplots()\nax.plot(x, y)\nax.set_xlim(0, 10)\nprint(ax.get_xlim()[1])`, "10.0", "set_xlim fixes the range of the horizontal axis, and the limits are stored as floats."),
    q(XY + `fig, ax = plt.subplots()\nax.plot(x, y, label="a")\nax.plot(x, x)\nprint(len(ax.get_legend_handles_labels()[1]))`, 1, "Only the lines that were given a label appear in the legend."),
  ]),
  () => pick([
    fv(XY + `fig, axes = plt.subplots(1, 2)\naxes[____].plot(x, y)  # draw on the second plot`, ["1", "-1"], "With one row, axes is a 1D array, and the second plot is at index 1.", "assert len(axes[1].lines) == 1"),
    fv(XY + `plt.plot(x, y, ____="--")  # dashed line`, ["linestyle", "ls"], "linestyle sets how the line is drawn, and \"--\" means dashed.", 'assert plt.gca().lines[0].get_linestyle() == "--"'),
    fv(XY + `fig, ax = plt.subplots()\nax.plot(x, y)\nax.____(0, 10)  # horizontal axis from 0 to 10`, ["set_xlim"], "set_xlim sets the range of the horizontal axis.", "assert ax.get_xlim() == (0.0, 10.0)"),
    fv(XY + `plt.scatter(x, y, ____=0.5)  # half-transparent points`, ["alpha"], "alpha sets the transparency, from 0 (invisible) to 1 (solid).", "assert plt.gca().collections[0].get_alpha() == 0.5"),
  ]),
];

// Topics in the order the toolbar popup lists them.
const TOPICS = [
  "Numbers and types", "Strings", "Lists", "Dictionaries", "Loops and conditions",
  "Functions: reading", "Functions: writing", "NumPy", "pandas", "pandas groupby",
  "pandas merge", "Matplotlib",
];

// Each generator gets an id made from its own source code. Progress is stored
// under that id, so it survives when generators are added or reordered.
const hash = (text) => {
  let h = 5381;
  for (const ch of text) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
};
const GENERATORS = []; // { id, topic, level (1 normal, 2 harder), make }
let currentTopic, currentLevel;
for (const item of BANK) {
  if (item === HARDER) currentLevel = 2;
  else if (typeof item === "string") [currentTopic, currentLevel] = [item, 1];
  else GENERATORS.push({ id: hash(item.toString()), topic: currentTopic, level: currentLevel, make: item });
}

// Picks a question type at random.
// - `only` lists the topics to draw from; an empty list means all of them
// - `weights` makes some types more likely than others (see nextWeight)
// - `harder` lists the topics whose harder questions are unlocked
let lastId = null;
function makeQuestion(only = [], weights = {}, harder = []) {
  const unlocked = (g) => g.level === 1 || harder.includes(g.topic);
  let pool = GENERATORS.filter((g) => only.includes(g.topic) && unlocked(g));
  if (!pool.length) pool = GENERATORS.filter(unlocked);
  if (pool.length > 1) pool = pool.filter((g) => g.id !== lastId); // no immediate repeats
  const weight = (g) => weights[g.id] || 1;
  let r = Math.random() * add(pool.map(weight));
  const chosen = pool.find((g) => (r -= weight(g)) < 0) || pool[pool.length - 1];
  lastId = chosen.id;
  return { ...chosen.make(), id: chosen.id, topic: chosen.topic, level: chosen.level };
}

// A wrong answer doubles how often a question type comes up (up to 8 times the
// normal rate). A right answer halves it (down to a quarter of the normal rate).
const nextWeight = (weight = 1, correct) =>
  correct ? Math.max(weight / 2, 0.25) : Math.min(weight * 2, 8);

// A topic's harder questions unlock at 17 right out of its last 20 answers
// (85%), and stay unlocked.
const RECENT = 20, PASS = 17;

// Returns the progress record updated with one answer. `today` is a date string.
function recordAnswer(stats, question, correct, today) {
  const recent = ((stats.recent[question.topic] || "") + (correct ? "1" : "0")).slice(-RECENT);
  const passed = recent.length === RECENT && recent.split("1").length - 1 >= PASS;
  const [right, total] = stats.days[today] || [0, 0];
  const days = { ...stats.days, [today]: [right + (correct ? 1 : 0), total + 1] };
  for (const old of Object.keys(days).sort().slice(0, -60)) delete days[old]; // keep 60 days
  return {
    weights: { ...stats.weights, [question.id]: nextWeight(stats.weights[question.id], correct) },
    recent: { ...stats.recent, [question.topic]: recent },
    harder: passed && !stats.harder.includes(question.topic) ? [...stats.harder, question.topic] : stats.harder,
    days,
  };
}

// The line shown above the code, and the words used when revealing the answer.
const promptFor = (question) =>
  question.prompt || (question.blank ? "What goes in the blank (____)?" : "What does this print?");
const answerLabel = (question) =>
  question.bug ? "the bug is on line" : question.blank ? "the blank is" : "it prints";

// Forgiving comparison: ignores spacing, quote style, and quotes around a plain string.
function isCorrect(input, accept) {
  const norm = (s) => s.replace(/"/g, "'").replace(/\s+/g, "");
  const given = norm(input);
  return accept.map(norm).some((expected) => given === expected || given === `'${expected}'`);
}

// Lets the test script load this file in Node. Chrome ignores it.
if (typeof module !== "undefined") {
  module.exports = { makeQuestion, isCorrect, nextWeight, recordAnswer, promptFor, answerLabel, GENERATORS, TOPICS, RECENT, PASS };
}
