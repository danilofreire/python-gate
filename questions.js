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

const frameCode = (city, sales) =>
  `import pandas as pd\ndf = pd.DataFrame({\n    "city": ${src(city)},\n    "sales": ${src(sales)},\n})\n`;

const GENERATORS = [
  // ---- numbers ----
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

  // ---- strings ----
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

  // ---- lists ----
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

  // ---- loops and conditions ----
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

  // ---- dictionaries and functions ----
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
  () => {
    const x = rand(2, 9), y = rand(2, 5);
    const def = "def double_plus(x, y=1):\n    return x * 2 + y\n\n";
    return pick([
      q(def + `print(double_plus(${x}))`, x * 2 + 1, "y was not given, so it takes its default value of 1."),
      q(def + `print(double_plus(${x}, ${y}))`, x * 2 + y, "The second argument replaces the default value of y."),
    ]);
  },

  // ---- pandas ----
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
  // ---- numpy ----
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

  // ---- functions: reading ----
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

  // ---- functions: writing (fill in the blank) ----
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
];

function makeQuestion() {
  return pick(GENERATORS)();
}

// Forgiving comparison: ignores spacing, quote style, and quotes around a plain string.
function isCorrect(input, accept) {
  const norm = (s) => s.replace(/"/g, "'").replace(/\s+/g, "");
  const given = norm(input);
  return accept.map(norm).some((expected) => given === expected || given === `'${expected}'`);
}

// Lets the test script load this file in Node. Chrome ignores it.
if (typeof module !== "undefined") module.exports = { makeQuestion, isCorrect, GENERATORS };
