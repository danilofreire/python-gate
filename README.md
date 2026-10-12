# Python Gate

A Chrome extension that makes you answer short Python questions before you can open distracting websites. Each correct answer earns browsing time.

The idea comes from a [post by @keysmashbandit](https://x.com/keysmashbandit/status/2109660673663729989), who did the same with mental maths and sudoku.

## How it works

- A blocked site opens behind a full-page quiz
- Each correct answer banks 3 minutes
- A wrong answer shows the right one with a one-line explanation
- "Use N min" spends the whole bank and starts a countdown in the bottom-right corner
- When the countdown ends, the quiz returns on every blocked tab
- The bank is shared across all blocked sites

## Install

Python Gate is not on the Chrome Web Store, so you load it from this folder.

1. Download or clone this repository
2. Open `chrome://extensions` and turn on "Developer mode" (top right)
3. Click "Load unpacked" and choose the `python-gate` folder
4. Pin the extension to the toolbar (puzzle icon, then the pin)

After you edit any file, press the reload arrow on the extension's card in `chrome://extensions`.

## Block and unblock sites

The default list is x.com, twitter.com, youtube.com, uol.com.br and reddit.com.

- To block a site, open it, click the Python Gate icon and press the "Block" button
- To unblock a site, click the icon and press "Remove" next to its name

Blocking a site also blocks its subdomains, so `youtube.com` covers `m.youtube.com`.

## Questions

There are 112 question types. Each one uses random values, so questions rarely repeat exactly.

| Topic | Types | Examples |
|-------|-------|----------|
| Python basics | 31 | operators, strings, lists, loops, conditions, dictionaries |
| Dictionaries | 7 | `.get`, `.items`, counting, nested dictionaries, comprehensions |
| Loops | 8 | `enumerate`, `zip`, `break`, `continue`, nested loops |
| List methods | 6 | `pop`, `insert`, `append` versus `extend`, `sort`, copies |
| String formatting | 5 | `:.2f`, `:,`, `:.1%`, zero padding, `round` |
| pandas | 12 | filtering, `groupby`, `sort_values`, missing values |
| pandas groupby | 5 | `mean`, `ngroups`, `idxmax`, `agg`, `transform` |
| pandas merge | 4 | inner, left, right and outer merges, suffixes |
| NumPy | 9 | indexing, `axis`, boolean masks, `reshape` |
| Reading functions | 10 | scope, missing `return`, keyword arguments, lambdas |
| Writing functions | 9 | fill in the blank: `return`, `def`, parameters, defaults |
| Plotting | 6 | Matplotlib calls, labels, `subplots`, `df.plot` |

Most questions ask what a snippet prints. The "writing functions" questions and most plotting questions show code with one `____` and ask for the missing piece.

Answers ignore spacing and quote style. Capital letters count (`True`, not `true`), and so does `3.0` versus `3`.

## Settings

- Minutes per correct answer: `MINUTES_PER_CORRECT` at the top of `content.js`
- Default block list: `DEFAULT_SITES` in `sites.js`
- Questions: the `GENERATORS` list in `questions.js`

## Permissions

Chrome will say the extension can read and change data on all websites. It needs this so you can block any site from the toolbar. On sites outside your block list it checks the address and does nothing else. It makes no network requests, and your block list and banked minutes stay in Chrome's local storage.

## Check the answers

`tests/check_answers.py` generates 300 versions of every question, runs each snippet in real Python and compares the output with the extension's answer. It needs Node, pandas, NumPy and Matplotlib.

```bash
python3 tests/check_answers.py
```

## Files

| File | Contents |
|------|----------|
| `manifest.json` | Extension settings |
| `sites.js` | Default block list and site matching |
| `questions.js` | Question generators and answer checking |
| `content.js` | Quiz screen and time bank |
| `popup.html`, `popup.js` | Toolbar popup |

## Licence

MIT. See `LICENSE`.
