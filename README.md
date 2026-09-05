# Jury's Out

A peer-to-peer jury deliberation party game for 1–8 players. Everyone in the
room gets a secret role and a private reason to vote the way they do. Argue,
accuse, whisper, and vote — then find out who was playing whom.

Inspired by Mafia and One Night Ultimate Werewolf, dressed as a courtroom.

- **No backend.** One HTML file on static hosting. Players connect directly to
  each other over WebRTC.
- **Mobile first.** Share a link, everyone taps it, the game is on.
- **1 player or 8.** AI jurors fill empty seats, take their turn, and argue back.
- **Turn-based round table.** One juror speaks at a time; pointing at someone
  draws a line across the table.
- **Arguments actually work.** Jurors hold live convictions that your case can
  move, and the AI votes from where you left it.
- **Evidence you can slam on the table**, a second round when the jury hangs,
  and a recap of how the room actually got there.
- **AI-generated cases.** Build a prompt in-app, paste it into ChatGPT or
  Gemini, paste the JSON back.

---

## Contents

- [Quick start](#quick-start)
- [How to play](#how-to-play)
- [The roles](#the-roles)
- [How verdicts are decided](#how-verdicts-are-decided)
- [Chat](#chat)
- [Making cases](#making-cases)
- [Modding](#modding)
- [Run your own signaling server](#run-your-own-signaling-server)
- [Connection problems](#connection-problems)
- [Troubleshooting](#troubleshooting)
- [How it works](#how-it-works)
- [Known limitations](#known-limitations)

---

## Quick start

### Deploy it

1. Push these files to a GitHub repo.
2. **Settings → Pages → Source: deploy from branch**, pick your branch, root.
3. Open `https://yourname.github.io/your-repo/`.

That's it. Everything is relative paths, so it works at a user site or a
`/repo-name/` subpath without changes.

### Run it locally

Do **not** open `index.html` by double-clicking. A `file://` origin blocks the
secure WebSocket the game needs, and it will fail to open a room. Serve it:

```bash
npx serve .
# or
python3 -m http.server 8000
```

### Play solo right now

Open the app → **Play solo (vs AI)** → **Set up case** → **Use sample case
instead** → **Start trial**. Three AI jurors are added automatically.

---

## How to play

### Hosting

1. Enter a name (or tap **Shuffle name**). It's remembered on your device.
2. **Start a trial.** You get a 4-character room code.
3. **Share invite link** — the native share sheet on mobile, clipboard on
   desktop. The link pre-fills the code so guests just type a name and tap Join.
4. **Set up case** — load a case before or after people join (see
   [Making cases](#making-cases)).
5. **Add AI juror** for any empty seats.
6. **Start trial** once you have 4+ jurors and a case loaded.

> **Tip:** load your case *before* sharing the link. Fetching JSON means leaving
> the app, and while the room now survives that, it's one less thing to go wrong.

### Joining

Tap the host's link, enter a name, tap **Join**. Or **Join a trial** and type the
code manually.

### The five phases

| Phase | What happens |
|---|---|
| **Role reveal** | Your role appears on a wax seal. Private. Don't share it. |
| **The trial** | The judge convenes, then both sides argue. Tap to advance. Counsel sometimes objects. |
| **Evidence** | Case summary, both statements, shared evidence, and any private evidence only you hold. |
| **Deliberation** | Jurors take turns at a round table. One speaks at a time. Host calls the vote. |
| **The vote** | Verdicts post live as they're cast. 90-second clock. |
| **Verdict** | Vote split, the real outcome, and every player's role and whether they hit their goal. |

Your role sits in a brass chip at the top of the evidence, deliberation, and vote
screens. Tap it to re-read your full brief.

---

## The roles

Every juror gets exactly one. Extra copies of **The Juror** fill the rest of the
seats.

| Role | Wants | Notes |
|---|---|---|
| **The Juror** | Whatever actually happened | The baseline. No agenda. |
| **The Bought Juror** | Not Guilty, no matter what | Someone paid you. |
| **The Vendetta Juror** | Guilty, no exceptions | It's personal. |
| **The Bleeding Heart** | Not Guilty, out of mercy | Sympathy, not corruption. |
| **The Hardliner** | Guilty, on principle | No patience for reasonable doubt. |
| **The Holdout** | No verdict at all | A hung jury is a win. |
| **The Last Word** | To cast the deciding vote | Must vote last *and* be decisive. |
| **The Insider** | The truth to come out | Holds evidence nobody else has. |

**How many special roles are in play**, by jury size:

| Players | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|
| Special roles | 2 | 2 | 3 | 3 | 4 |

Roles are dealt by the host and sent privately to each player. They're never
broadcast.

### Playing The Last Word

The trickiest role. You win only if you cast the **final ballot** *and* it was
**decisive** — meaning if you'd voted the other way, the room lands somewhere
else. Votes post live, so watch the tally and hold yours. But go past the
90-second clock and you're held in contempt, which is an automatic loss.

---

## How verdicts are decided

A verdict needs **60% of the ballots actually cast**. Anything less is a hung
jury.

Real juries need unanimity, and that was the first version — it made the game
close to unwinnable, because any two opposed roles could hang every case. Tuned
by simulation:

| Threshold | Hung juries | Player win rate |
|---|---|---|
| Unanimous | ~74% | 11% |
| Two-thirds | ~48% | 38% |
| **60% (current)** | **~28%** | **~47%** |

At 60%, every role lands in a competitive 30–56% range.

The bar is **strictly more** than 60% of ballots cast — `floor(n × 0.6) + 1`.
Rounding up instead looked equivalent but broke 5-juror games: `ceil(5 × 0.6)`
is 3, so every possible 3-2 split cleared it and the room could never hang,
which meant **the Holdout could not win at all at that size**. The current
formula is identical at 4, 6, 7 and 8 jurors.

**Multi-defendant cases** don't need a clean sweep — hitting your target on most
defendants counts as a win.

**Contempt of court:** if you don't submit a vote before the clock runs out, your
ballot is recorded as contempt. It counts toward neither side, is excluded from
the threshold, and **you automatically lose** whatever your role was.

Change the threshold at `VERDICT_RATIO` in `index.html`.

---

## Chat

Tap **Jury chat** (or **Speak up** during deliberation). The last three messages
also preview on the deliberation screen.

### Compose bar

| Control | Does |
|---|---|
| **To: Everyone** | Tap to cycle through jurors. Addressed messages show `→ Name` to the whole room. |
| **Whisper: off** | With a juror selected, sends only to them. Resets after one message. |
| **Say / Slam / Sneer** | Delivery style for your typed message — normal, hard slam with a rumble, or a sneer with a deflating sound. |

Type freely (240 characters, Enter sends, Shift+Enter for a newline), or use the
presets.

### Preset categories

**In character** (your role's voice), **Press**, **Doubt**, **Back up**,
**Accuse**, **Stall**, **React**, **Close it** — 83 lines in the bank, about 46
available to you in any given game.

Lines containing `{target}` need a juror selected first and stay dimmed until you
pick one. Lines with `{evidence}` open a chip picker so you can cite a specific
exhibit.

**Address a bot directly and it replies to you** in character.

> **Whispers are not private from the host.** The host relays every message, so
> other players can't see your whisper but whoever is hosting can. Unavoidable in
> a host-relay design without adding encryption.

### Turn-based deliberation

Deliberation happens at a **round table**. Everyone sits in a ring, each with
their own colour, and exactly one juror holds the floor at a time.

- You get **24 seconds** and **one message** per turn.
- Speak and the floor passes on immediately.
- Say nothing and you're marked **passed** — you forfeit that round's slot.
- Turns cycle continuously in rounds until the host calls the vote.
- **AI jurors only speak on their own turn**, which is what keeps them from
  burying the conversation.
- **Whispering is always allowed**, even when it isn't your turn. It's private
  side-talk, not the floor.

Address someone and a **coloured line arcs across the table** from your seat to
theirs, with an arrowhead — so the whole room can see who is pointing at whom.
The newest line is solid; older ones fade and go dashed. Each juror's most
recent remark floats as a bubble beside their seat.

Address a bot directly and it will answer **you** when the floor reaches it.

Tune it with `TURN_SECONDS`.

### Persuasion — arguments actually move votes

Every juror carries a live **conviction** from -1 (Not Guilty) to +1 (Guilty),
shown as a lean meter under their seat. Speaking exerts pressure on everyone
listening, and **AI jurors vote from where deliberation left them**, not from
the opinion they started with.

What affects how much you move someone:

| Factor | Effect |
|---|---|
| What you said | Scored for which side it pushes — "reasonable doubt" pulls one way, "the evidence proves it" the other |
| **Slam** delivery | ~35% more forceful than a normal line |
| **Sneer** delivery | Weaker, and aimed at someone it often *hardens* them against you |
| Addressing them directly | ~70% more weight than speaking to the room |
| Their role | Bought, Vendetta, Hardliner and Bleeding Heart barely budge. Truth Seekers are wide open |
| Repetition | Sharp diminishing returns — the same line to the same juror stops working |

Sustained pressure can even crack a committed role into wavering at the ballot.

Feedback is immediate: seats that shifted flash ▲/▼, a **room read** counts who
leans where, and after you speak you're told exactly who you moved — or
"Nobody budged."

**Balance:** tuned by simulation. Three hard arguments move guilty verdicts from
~33% to ~63%. Arguing clearly pays, but the room has to be won rather than
steamrolled — at the first value tried it was 94%, which meant spamming one line
was a winning strategy. Adjust with `PERSUASION_BASE`.

> The lean meter shows what a juror has **said**, not how they'll vote. A human
> player can talk one way and vote another — reading the room is a skill, not a
> readout.

### Citing evidence

Pointing at an actual exhibit beats asserting things. Attach one with **Cite**
in the compose bar, or pick one when a preset line has an `{evidence}` slot.

- The exhibit **flies onto the middle of the table and stamps**, with a thud.
- The argument lands **~45% harder** (`EVIDENCE_CITE_BONUS`).
- It also **steers** the argument: cite something that favours the prosecution
  and it pushes toward guilty, whatever your wording.

The host validates every citation against the real case, so a modified client
can't invent an exhibit or lie about which side it favours.

### Hung juries get a second round

A first hung ballot no longer ends the game — it was the least interesting
possible ending now that arguments move people. Instead:

- The **Deadlock** screen shows the split and how many votes were needed.
- **Nothing is revealed** — no roles, no true outcome.
- The host can **send them back to deliberate** or **accept the hung jury**.
- Convictions carry over, but **argument fatigue resets**, so the same points
  can land again on a room that has now heard them once.
- A second hung ballot stands. The Holdout wins.

Set the limit with `MAX_VOTE_ROUNDS`.

### Post-game recap

The verdict screen opens with **How it happened** — the deliberation retold from
the sway log:

> It took 2 ballots to get here.
> Mabel crossed to guilty after Sam pressed them in round 1.
> Sam shifted the room more than anyone else.
> Otto and Rae never budged.

### Re-examining the evidence

**Re-examine the case file** appears on both the deliberation and vote screens.
It reopens the full case — summary, both statements, all shared evidence, and
your own private evidence — without losing your place. Emphasis markup is
stripped so it reads as a plain document rather than a performance.

---

## Making cases

### Generate one with AI

1. **Set up case** → fill in crime type, number of defendants, tone, and whether
   to loosely base it on a real case.
2. **Generate prompt** → **Copy prompt**.
3. Paste into ChatGPT, Gemini, Claude, whatever. Copy the JSON reply.
4. Paste into the box → **Load case**.

The paste box is **blurred on purpose** so you don't read the verdict while
setting up. Tap **Reveal** if you need to inspect it.

The generated prompt already tells the model to use plain ASCII quotes, avoid
quotation marks inside strings, skip markdown fences, and write the verdict
backwards. If the JSON still doesn't parse, the loader tries a ladder of repairs
(fences, curly quotes, trailing commas, surrounding prose) and reports which one
worked in the connection log.

### Hiding the answer

The true verdict is stored obfuscated as `trueOutcomeEnc`, and the AI is asked to
send it reversed (`ytliug` / `ytliug_ton`) so it isn't readable in the JSON you
paste. **Copy sealed case** gives you a sealed copy to save as a content pack.

**This is obfuscation, not encryption.** The game is one static file, so the salt
ships inside it and anyone determined can decode it in devtools in a minute.
What it does buy: the host can't read the answer by accident, it isn't sitting on
screen during setup, and case files on GitHub aren't spoilers. Players never
receive the outcome at all until the reveal — that's the real protection.

### Schema

```jsonc
{
  "caseId": "case-001",
  "title": "State v. Doe",
  "basedOn": "Host-only note. Never shown to players.",
  "contentWarnings": ["violence"],
  "tone": "grounded",                  // grounded | dramatized | satirical
  "numDefendants": 1,
  "defendants": [
    {
      "id": "d1",
      "name": "Jordan Doe",
      "trueOutcomeEnc": "DQAbFVkL"     // sealed. Or trueOutcomeRev, or trueOutcome
    }
  ],
  "summary": "2-4 sentences, read to the whole table.",
  "prosecutionStatement": "Opening argument for guilt.",
  "defenseStatement": "Opening argument for doubt.",
  "evidence": [
    {
      "id": "e1",
      "title": "Security footage",
      "description": "Written to be read aloud.",
      "favors": "prosecution",         // prosecution | defense | neutral
      "visibility": "public",          // public = everyone. private = one juror.
      "insiderOnly": false             // at most one item; goes to The Insider
    }
  ]
}
```

**Any of three outcome forms is accepted** and normalized to sealed on load:
`trueOutcome` (plain), `trueOutcomeRev` (reversed), `trueOutcomeEnc` (sealed).

**Balance tip:** give your **public** evidence an equal number of
prosecution-favoring and defense-favoring items. If public evidence tilts one
way, neutral AI jurors drift with it and the opposing roles have nobody to
persuade. All three built-in cases were retuned for exactly this reason.

### Dramatic markup

Statements are performed, not printed. Mark them up:

| Markup | Effect |
|---|---|
| `**text**` | Lands all at once, glowing, with a rumble and a camera lean |
| `*text*` | Brass emphasis |
| `_text_` | Quiet aside, drifts in |
| `~text~` | Sneering, wobbles |

Even unmarked text gets treated: numbers pop, legal terms like "beyond a
reasonable doubt" go red, quoted testimony italicizes, and absolutes like
"never" and "no one" slam automatically.

---

## Modding

### Content packs — add cases without touching code

Drop files in `content/` next to `index.html`. No `manifest.json` is fine; the
game just runs its built-ins.

```
content/
  manifest.json
  cases/     my-case.json
  names/     my-names.json
  phrases/   my-phrases.json
```

**`content/manifest.json`**

```json
{
  "cases": ["cases/my-case.json"],
  "names": ["names/my-names.json"],
  "phrases": ["phrases/my-phrases.json"]
}
```

Loaded cases appear as **Load: <title>** buttons on the case setup screen. Each
is validated; invalid ones are skipped with a console warning rather than
breaking the game. A case file may contain one object or an array of them.

**`names/*.json`** — extends the random name generator.

```json
{ "firsts": ["Juniper", "Rook"], "lasts": ["Voss", "Pemberton"] }
```

**`phrases/*.json`** — extends the chat bank.

```json
{
  "categories": {
    "accuse": [{ "text": "{target}, you haven't looked up once.", "style": "slam" }],
    "press":  [{ "text": "{target}, could {defendant} have done this alone?", "style": "slam" }]
  },
  "roles": {
    "hardliner": [{ "text": "A badge doesn't lie.", "style": "slam" }]
  },
  "general": [{ "text": "Somebody has to be lying.", "style": "slam" }]
}
```

Styles: `flow`, `slam`, `sarcasm`. Tokens: `{defendant}`, `{evidence}`,
`{target}`. Categories: `press`, `doubt`, `back`, `accuse`, `stall`, `react`,
`close`. Anything in `general` shows under **React**.

### Tuning constants

All near the top of the `<script>` in `index.html`.

| Constant | Default | Does |
|---|---|---|
| `VERDICT_RATIO` | `0.6` | Share of ballots needed for a verdict |
| `MIN_PLAYERS` | `4` | Jurors required to start (bots count) |
| `MAX_PLAYERS` | `8` | Seats in the jury box |
| `VOTE_SECONDS` | `90` | Clock before contempt |
| `TURN_SECONDS` | `24` | Length of one juror's turn at the table |
| `PERSUASION_BASE` | `0.11` | How much one argument moves a listener |
| `EVIDENCE_CITE_BONUS` | `1.45` | Extra weight for citing a real exhibit |
| `MAX_VOTE_ROUNDS` | `2` | Ballots before a deadlock stands |
| `STUBBORNNESS` | per role | How much each role resists persuasion |
| `ROLE_COUNTS_BY_PLAYERS` | `{4:2 … 8:4}` | Special roles per jury size |
| `CHAT_MIN_INTERVAL_MS` | `1100` | Chat rate limit |
| `CODE_LENGTH` | `4` | Room code length |
| `REGISTRATION_BUDGET` | `4` per 60s | Connection attempts before cooldown |
| `TURN_SERVERS` | Open Relay | NAT traversal relays — see below |
| `SIGNAL_CANDIDATES` | PeerJS cloud | Signaling servers to try |

**Don't change `OUTCOME_SALT`** — every already-sealed case file would stop
decoding. The two `localStorage` keys are likewise best left alone; renaming them
wipes saved names and sound settings.

### Adding a role

1. Add an entry to `ROLES`:

```js
mole: {
  name: 'The Mole',
  tagline: 'Win: one specific defendant walks.',
  category: 'verdict',
  flavor: "Long second-person backstory shown on the seal…",
  win: { type: 'defendant_verdict', value: 'not_guilty', defendantIndex: 0 }
}
```

2. Add the id to `SPECIAL_ROLE_IDS`.
3. Add lines to `CHAT_PHRASES.roles.mole`.
4. Bump `ROLE_COUNTS_BY_PLAYERS` if you want it dealt more often.

Supported `win.type` values: `verdict` (`guilty` / `not_guilty` /
`true_outcome`), `hung_jury`, `swing_vote`, `defendant_verdict`. For anything
genuinely new, add a branch to `checkWin()`.

### Sounds

All 14 are synthesized with WebAudio at runtime — no audio files. `gavel`,
`quake`, `whoosh`, `blip`, `tap`, `sting`, `objection`, `murmur`, `sarcasm`,
`tick`, `tock`, `heartbeat`, `drumroll`, `stamp`, plus a continuous room-tone
ambience. Edit them in `playSound()`; the note toggle is top-left.

---

## Run your own signaling server

**Why:** the free shared PeerJS broker rate-limits busy clients. That is the
single most common cause of "Could not open a room." Your own server ends this
permanently.

**What it costs:** effectively nothing. The server only introduces players to
each other; all gameplay is peer-to-peer, so bandwidth is negligible and a free
tier is genuinely enough.

A ready-to-deploy server is in **[`peerserver/`](peerserver/)**. Short version:

```bash
cd peerserver
npm install
npm start          # listens on :9000
```

Then **Settings → Signaling server** → `localhost:9000:/`

### Deploy free on Render

1. Push the repo (the `peerserver` folder can live inside your game repo).
2. Render → **New → Web Service** → connect the repo.
3. **Root Directory:** `peerserver`
4. Runtime **Node**, Build `npm install`, Start `npm start`, Free instance.
5. Copy the hostname and enter it in **Settings**:
   `your-app.onrender.com:443:/`

Verify with `curl https://your-app.onrender.com/` — you should get JSON.

**Caveat:** Render idles free services after ~15 minutes and the next request
waits ~50s while it wakes. Load the URL a minute before game night.

You can also set it per-session with a URL parameter, handy for testing:

```
https://yourname.github.io/jurys-out/?peer=your-app.onrender.com:443:/
```

Settings saves to the device; the URL parameter overrides it.

---

## Connection problems

There are **two** separate network layers, and they fail differently.

### 1. Signaling — "Could not open a room"

Finding each other. Handled by the PeerJS server above. Symptoms: room won't
open, or `network` / `server-error` in the log. Usually rate limiting. The game
retries once per server with a jittered backoff and caps itself at 4 attempts
per minute so it doesn't make the throttling worse.

### 2. NAT traversal — `negotiation-failed`

Actually reaching each other once introduced. If two phones on the same wifi work
but **Android on mobile data fails**, this is why: carrier-grade NAT means no
direct path exists, and only a **TURN relay** can bridge it.

The game ships with four STUN servers and the Open Relay public TURN service, so
cellular has a chance out of the box. **Open Relay is a free shared service — it
may be rate-limited or down.** If Android still fails, that's the first thing to
suspect.

To use your own, edit `TURN_SERVERS`:

```js
const TURN_SERVERS = [
  { urls: 'turn:your.turnserver.com:3478', username: 'user', credential: 'pass' },
  { urls: 'turn:your.turnserver.com:443?transport=tcp', username: 'user', credential: 'pass' }
];
```

Options: **Cloudflare** and **Metered** both have free TURN allowances, or
self-host **coturn**. Quick test without editing anything:

```
?turn=turn:host:3478|username|credential
```

Include a TCP/443 variant — it's what gets through restrictive firewalls.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Could not open a room" immediately | Opened via `file://` | Serve over http, or use GitHub Pages |
| "Could not open a room", repeated | Shared broker rate limit | Wait ~60s, or run your own server |
| Stuck on "Opening room…" | Broker accepted then stalled | 12s watchdog retries automatically |
| Room code changed mid-game | Old build | Update — codes now survive reconnects |
| `negotiation-failed` | No direct route | Needs TURN; try wifi to confirm |
| Android on cellular fails, wifi works | Carrier NAT | TURN relay required |
| Player joins then drops | Idle channel or backgrounded phone | Fixed by 12s keepalive; update if on an old build |
| Room dies when fetching case JSON | Old build | Fixed — the room revives on the same code |
| "That's not valid JSON" | Curly quotes from ChatGPT | Auto-repaired now; check the log for which repair ran |
| Can't tap Start trial | Under 4 jurors, or no case | Add AI jurors and load a case |
| No sound | Browser needs a tap first, or muted | Tap anything; check the ♪ toggle |
| PeerJS didn't load | unpkg blocked | Vendor `peerjs.min.js` locally and update the `<script>` src |

**The connection log** at the bottom of the lobby is your friend — it records
protocol, WebRTC support, every attempt, and the exact error type. On mobile,
where devtools aren't handy, this is the fastest way to see what's wrong.

---

## How it works

```
Host browser  ←── WebRTC data channels ──→  Player browsers
     │                                            │
     └────── PeerJS server (introductions only) ──┘
```

- **Star topology.** Everyone connects to the host; the host relays. Avoids
  managing 8-way mesh connections.
- **Host authority.** The host holds the case, deals roles and evidence, tallies
  votes, and resolves win conditions. Clients get only what they should know.
- **Room codes** are the host's peer id (`jurys-out-XXXX`), using a 32-character
  alphabet with no `I`, `O`, `0`, or `1` so codes are easy to read aloud.
- **AI jurors** run locally in the host's browser. They read the same evidence a
  player sees — each with its own standing disposition — and can be wrong. Only
  The Insider knows the real outcome.

### Files

```
index.html                  the entire game
icon.png                    512px app icon
apple-touch-icon.png        180px iOS icon
manifest.json               PWA manifest — installs to home screen
README.md                   this file
peerserver/                 optional signaling server
content/                    optional content packs
```

---

## Known limitations

Being straight about what doesn't work:

- **No host migration.** If the host closes the tab, the room dies.
- **TURN is best-effort.** The bundled public relay may be down. Your own is the
  only reliable answer for cellular players.
- **Whispers aren't private from the host** — the host relays all traffic.
- **Sealed outcomes are obfuscated, not encrypted.** A static-file game can't
  keep a secret from someone with devtools.
- **The round table is built for 8.** The colour palette and seat spacing assume
  the 8-seat maximum; raising `MAX_PLAYERS` needs more colours and smaller seats.
- **Needs internet even for solo play** — PeerJS and fonts load from CDNs, and a
  room is opened even in solo mode.
- **Free-tier cold starts.** A self-hosted server on a free plan may take ~50s to
  wake.

---

## Credits

- [PeerJS](https://peerjs.com) — WebRTC signaling and data channels
- [Fraunces](https://fonts.google.com/specimen/Fraunces) and
  [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) via Google Fonts
- Sounds synthesized in-browser with the Web Audio API — no samples
- Cases are fiction. Any "based on a real case" content is fictionalized by
  instruction to the model; names and details are invented.
