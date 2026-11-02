# Exam papers: how a past paper gets onto the shelf

This is the repeatable recipe for putting a full-length paper on the **Exam papers** page (`/app/papers`): a STEP12 mock, an academy final, or any paper STEP12 has the right to publish. Real College Board / Bluebook test questions are copyrighted, so they don't go on the shelf (see the content rule in HANDOFF.md). Follow it for every new year (2025, 2026, …).

```
PDF ──render.sh──▶ page PNGs + OCR text ──(type it up)──▶ scripts/papers/src/<id>.json + fig/<id>/*.svg
     ──validate.mjs──▶ errors to fix ──build.mjs──▶ public/tests/paper-<id>-{rw,math}.json + public/papers/index.json
```

## 1. Render the PDF

```bash
scripts/papers/render.sh "SAT Int - 10.2024 A.pdf" /tmp/papers/2024-10-int-a
```

Each page becomes `p-NN.png` (longest side 2000 px) plus `p-NN.txt` (Tesseract OCR). The OCR is only a typing aid: **the page image is the source of truth.** Use this when the paper exists as a PDF (e.g. a mock printed for a classroom session).

`python3 -I scripts/papers/sheet.py <dir> <first> <last> out.png 6 330` makes a contact sheet of pages, handy for mapping a PDF quickly (where modules start, which pages are answer keys, duplicates, "MISSING" placeholders).

## 2. Name the paper

| Field | Rule |
|---|---|
| `id` | `YYYY-MM-int` or `YYYY-MM-us`, plus `-a`, `-b`, … for versions: `2024-10-int-c` |
| `region` | `International` or `US` |
| `version` | `"A"`, `"B"`, …; omit when the month has one paper |
| `format` | `digital` (Bluebook, 2 modules per section) or `paper` (old pencil SAT: Reading, Writing & Language, Math no-calculator, Math calculator) |

The shelf shows it as e.g. **"October 2024 International · Version C"**.

## 3. Source file format

`scripts/papers/src/<id>.json`:

```jsonc
{
  "id": "2023-10-int",
  "year": 2023, "month": 10, "region": "International", "format": "digital",
  "version": "A",                       // optional
  "source": "SAT Int - 10.2023.pdf",
  "note": "optional line shown on the card",
  "passages": {                          // optional, shared passages (paper SAT)
    "R1": { "intro": "This passage is adapted from …", "lines": ["printed line 1", "printed line 2", "…"] },
    "W1": { "html": "<p>… <u data-q=\"1\">underlined part</u> …</p>" }
  },
  "sections": [
    { "type": "EBRW", "modules": [
      { "title": "Section 1, Module 1: Reading and Writing", "minutes": 32, "questions": [ /* … */ ] },
      { "title": "Section 1, Module 2: Reading and Writing", "minutes": 32, "questions": [ /* … */ ] } ] },
    { "type": "MATH", "modules": [
      { "title": "Section 2, Module 1: Math", "minutes": 35, "questions": [ /* … */ ] },
      { "title": "Section 2, Module 2: Math", "minutes": 35, "questions": [ /* … */ ] } ] }
  ]
}
```

Paper-SAT sections: EBRW = `Reading` (65 min, 52 q) + `Writing and Language` (35 min, 44 q); MATH = `Math Test – No Calculator` (25 min, 20 q) + `Math Test – Calculator` (55 min, 38 q). Give each section a `"label"` ("Reading & Writing", "Math").

A paper may have only one section if the PDF has only one. Keep the modules in printed order.

### A question

```jsonc
{
  "n": 7,                     // printed number within its module; must run 1, 2, 3 … with no gaps
  "page": 12,                 // PDF page it came from (for re-checking)
  "passage": "<p>…</p>",      // HTML or null. R&W: the text/notes/table. Math: a table, if any
  "passageRef": "R1",         // paper SAT: use a shared passage instead of "passage"
  "focus": 12,                // Writing & Language: the data-q number this question is about
  "question": "Which choice completes the text with the most logical and precise word or phrase?",
  "format": "mc",             // "mc" or "sa" (student-produced response / grid-in)
  "options": ["…", "…", "…", "…"],   // exactly 4, without the A/B/C/D letters
  "correct": 2,               // 0 = A … 3 = D
  "answer": null,             // sa only: "7" or "3/4|.75|0.75" (every accepted form, "|"-separated)
  "figure": "m1-q14.svg"      // math figure file in scripts/papers/src/fig/<id>/ (or omit)
}
```

A question the PDF doesn't contain (pages lost, "MISSING" stamp, cut off) is `{ "n": 2, "missing": true }`. Never invent one.

## 4. Typing rules (accuracy is the whole point)

**Text**
- Type exactly what is printed: spelling, punctuation, capitals, italics (`<em>`), bold, underlines (`<u>`), curly quotes “ ” ‘ ’, em dashes —, and the blank as `______` (six underscores).
- Keep paragraph breaks (`<p>`), bullet lists (`<ul><li>`), "Text 1" / "Text 2" headings (`<p><strong>Text 1</strong></p>`), poem line breaks (`<br>`), and tables (`<table>` with `<th>`). Table titles go in a `<p><strong>` above the table.
- Drop everything that isn't the question: watermarks, "Mark for Review", timers, page footers, a test-taker's highlights and selections.
- R&W: the text goes in `passage`; the question line ("Which choice …") goes in `question`.

**Math notation** — every piece of math goes inside `\( … \)` (KaTeX). Dollar signs are plain text (`$45`), never math delimiters.
- Variables are math: `\(x\)`, `\(f(x)\)`, not bare x.
- Powers `\(x^{2}\)`, roots `\(\sqrt{3}\)` `\(\sqrt[3]{x}\)`, fractions `\(\frac{3}{4}\)` (use `\dfrac` only for display-size), `\(\leq\)` `\(\geq\)` `\(\neq\)` `\(\pi\)` `\(\theta\)` `\(^\circ\)`, `\(\angle ABC\)` `\(\overline{AB}\)` `\(\triangle ABC\)` arc `\(\overset{\frown}{AB}\)`, absolute value `\(\lvert x \rvert\)`, systems with `\begin{aligned}…\end{aligned}` or `\begin{cases}`, multiplication `\(\cdot\)` / `\(\times\)` exactly as printed, minus as `-`.
- Options are typed the same way: `"\\(y = 3x - 4\\)"` (JSON escapes the backslash).
- Numbers in running text stay plain (`45 minutes`); a number that is part of an expression goes in the math.

**Figures**
- Redraw every graph, diagram, shape and chart by hand as SVG in `scripts/papers/src/fig/<id>/<module>-q<n>.svg` (e.g. `m2-q14.svg`, `rw1-q8.svg`).
- Must be accurate: same axes ranges, tick labels, grid, plotted points/lines/curves at the right coordinates (compute them from the equation where one is given), labels, angle marks, "Note: Figure not drawn to scale." if printed.
- Format: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" font-family="Georgia, serif" font-size="14">…</svg>`, black strokes on a transparent background, no `<image>`, no scripts, no external links. Text labels use `<text>`; italic variables `font-style="italic"`.
- Math figure → `"figure": "m1-q14.svg"`. A chart inside an R&W text → `<img class="fig" src="fig:rw1-q8.svg" alt="short description">` inside `passage`.
- Tables are HTML tables, not figures.

**Answers**
- Solve every question yourself and compare with the paper's answer key; resolve every disagreement before publishing.
- Math: work it out carefully, and check numerically where you can. Grid-ins list every accepted form ("2/3|.6666|.6667|0.666|0.667").

## 5. Check and build

```bash
node scripts/papers/validate.mjs scripts/papers/src/2023-10-int.json   # structure, keys, KaTeX syntax, figures, leftover watermarks
node scripts/papers/build.mjs                                         # writes the tests + index
npm run build && open http://localhost:3011/app/papers?year=2023        # look at it
```

`build.mjs` regenerates `public/papers/index.json` from every source file, so a source file with `"draft": true` stays off the shelf until it is finished.

## 6. The page

`src/app/pages/ExamPapers.tsx` reads `public/papers/index.json`: year buttons (2023–2026), an International/US filter, one cue card per paper with a row per section. Each section is a normal test (`/app/tests/paper-<id>-rw/take`), so modes, timers, results, mistakes and Sensai all work as for practice tests. Math is rendered by `src/app/tex.ts` (KaTeX, `\( … \)` only), and per-module `title` / `minutes` override the defaults in `TakeTest.tsx`.
