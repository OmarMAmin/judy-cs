# Judy@CS

A metro map for learning computer science, made for Judy.

It is a roadmap, not a textbook. Each station says what a topic really is, gives an everyday
example, explains why it matters, and points to the best places on the internet to learn it.
Lines are organised by topic and can be ridden in any order, at any pace.

## Lines

| | Line | What it covers |
|---|---|---|
| 0 | Start here | What CS is, how to learn, setting up, first program |
| 1 | Python | One course, CS50P, followed week by week, plus a bridge to C++ |
| 2 | Tools nobody teaches you | Terminal, editor, Git, GitHub, asking questions, AI helpers |
| 3 | Thinking like a computer scientist | Problem solving, algorithms, Big-O, recursion, data structures |
| 4 | Maths without fear | Logic, proofs, counting, calculus, linear algebra |
| 5 | How computers actually work | Binary, logic gates, CPU, memory, operating systems, the internet |
| C | Cairo line | Campus communities, Cairo events, hackathons, free national training |
| B | Bonus line | Student freebies, and programmes that open doors |
| S | Side quests | Puzzles, fun projects, creative coding, communities, scholarships |

## Preview it locally

The page loads its content from JSON files, so it needs a small web server. Opening
`index.html` straight from disk will show a "could not load" message.

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Keeping it simple

Each learning station has one starred pick and at most two helpers. Checklist stations on the Bonus and Cairo lines may list more, because those are things to claim, not options to choose between. That is deliberate: too many
options is a reason not to start. When adding a link, replace one instead of adding a fourth.

## Editing the content

Everything on the page comes from two files. No HTML editing is needed.

- `data/resources.json` holds every link: name, URL, type, topic, cost, time, level, language
  and a one-line reason. Each one has a unique `id`.
- `data/roadmap.json` holds the lines and stations. A station has an `intro`, an optional
  Egyptian Arabic aside in `ar`, an `example`, a `why`, a `boss` challenge, and `picks`.
  Each pick refers to a resource by its `id`. Set `"star": true` on the one to start with,
  and add an optional `"note"` for things like recruitment timing.

To add a station, copy an existing one inside the right line and change the text. Station
`kind` can be `station`, `interchange` or `terminus`. `level` can be `easy`, `medium` or `later`.
`connects` links a station to one on another line.

## Checking links

```
python3 tools/check_links.py
```

It checks every URL in the library and prints the real title of each YouTube video and
playlist. A few sites block automated checks and are flagged as "check by hand".

Event dates and recruitment windows on the Cairo line change every year, so the page only
says "usually around". Re-check them each autumn.

## Design notes

- Text and line colours are chosen to meet WCAG AA contrast (4.5 to 1) in light and dark mode. If you change a line colour in `data/roadmap.json`, keep white text on it readable.
- In dark mode the tracks and dots use a lightened version of each line colour automatically.
- Tap targets are at least 44 pixels. Text columns are capped at about 70 characters.
- `assets/og.png` is the preview image shown when the link is shared.

## Notes

- Progress ticks are stored only in the visitor's own browser.
- The page asks search engines not to index it.
- Plain HTML, CSS and JavaScript. No build step and no dependencies.
