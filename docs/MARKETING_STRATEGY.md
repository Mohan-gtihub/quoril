# Quoril — Go-To-Market & Marketing Playbook

**Version:** 1.0
**Prepared for:** The marketing person executing this plan
**Stage:** Pre-launch / waitlist building
**Team:** A small marketing team — **no ad budget (100% organic)**
**Positioning:** Premium global (US-first) productivity software
**Author note:** This is a self-contained execution document. You do not need to talk to the product team to run it. Everything you need — what the product is, who it's for, what to say, where to say it, and exactly what to post — is below. Follow it top to bottom.

---

## ⚠️ READ THIS FIRST — Three Non-Negotiable Rules

1. **Never mention India, Indian origin, ₹ rupees, IST, or any India-specific reference anywhere a customer can see it.** The product is positioned as a premium global tool built for serious knowledge workers. All prices shown to users are in **USD**. All times in posts/emails use **US time zones (ET/PT)**. **No individual founder is presented at all** — everything is "Quoril / the Quoril team / we" (see §4.5). No real name, no face, no personal location. This is not about hiding anything — it's about matching the premium, global category we compete in (Linear, Notion, Superhuman, Rize all read as "global software," not "country X software"). Apply this rule to: bios, captions, ad copy, email signatures, support replies, screenshots, the website, everything.

2. **Quoril is NOT "just another habit tracker."** It is a **desktop-native focus + productivity command center**. Saying "habit tracker" puts us in a crowded, cheap, low-trust category. We compete in the **focus/deep-work + time-analytics** category (Blitzit, Rize, RescueTime, Sunsama, Todoist). Use the language in Section 3 — never "habit tracker app."

3. **Premium tone, always.** $4/mo with a free trial is positioned as "cheap for what it does," not "a budget app." Visuals must be clean, dark, high-end (lime-on-black brand). No cheap clipart, no spammy emojis-in-every-word captions, no "🔥🔥🔥 BUY NOW." We sound like Linear or Vercel, not like a discount Gumroad product.

---

## 1. The Product in One Page (so you can speak about it confidently)

**What it is:** Quoril is a desktop app (Windows, macOS, Linux) that combines three things developers/makers normally juggle across three separate tools:

1. **A fast Kanban task planner** (Backlog → This Week → Today → Done) with auto time-estimates.
2. **A focus engine** — a full-screen deep-work mode, a Pomodoro timer, and a floating always-on-top "focus pill" that hovers over every other app showing your current task + timer.
3. **Automatic, private screen-time & app analytics** — it quietly tracks which apps/websites you actually used (every 5 seconds), categorizes them (Development, Work, Comms, Entertainment), and shows you honest reports: where your time really went, your productivity score, your top distraction.

**The one-line pitch:**
> **Plan it. Focus on it. See where your time actually went — all in one private desktop app.**

**The wedge (why it's different):** Every competitor does ONE of these. Todoist plans but doesn't track focus or screen time. RescueTime/Rize tracks time but doesn't manage tasks. Blitzit does focus + tasks but not deep automatic analytics. **Quoril is the only one that closes the full loop: what you planned → whether you focused → where the time actually went.**

**Key trust differentiator:** **Offline-first & private.** Your data lives on your machine (local SQLite), not harvested in the cloud. This is a *huge* selling point for privacy-conscious US/Western developers who distrust surveillance-style productivity tools.

**Core feature list (for reference when writing content):**
- 4-column Kanban with drag-and-drop and `[25m]` auto time-parsing
- Full Focus Mode (full-screen deep work)
- Floating "Super Focus Pill" (always-on-top widget over all apps)
- Pomodoro timer (configurable work/break)
- Automatic app + website tracking (20+ categories, 5-sec sampling)
- Screen-time dashboard (heatmaps, hourly usage, productive vs distracting split)
- Reports: focus time, productivity score (0–100), task completion, top distraction, estimation accuracy, context-switching score
- Workspaces & lists, subtasks, recurring tasks, streaks
- 5 themes (signature: "Onyx Dark" — lime #c4f82a on near-black)
- Offline-first with background cloud sync
- Visual whiteboard/canvas for planning

**Platforms:** Windows, macOS, Linux desktop. (Not a phone app — this is a *desktop work tool*, which is itself a positioning advantage: "for when you're actually at your computer doing real work.")

---

## 2. Pricing & Funnel (what we're selling)

| Plan | Price | Marketed as |
|---|---|---|
| **Annual** ⭐ (the default — push this) | **$48 / year** | "$4/mo, billed annually" |
| **Monthly** (the anchor) | **$6 / month** | full price |
| **Lifetime** (launch-only, capped at first 500) | **$79 one-time** | "Early-adopter deal — launch week only" |
| **Trial** | **14 days, card required** | auto-converts to the annual plan |
| Currency shown | **USD only** | — |

**The pricing logic (so the team prices/communicates it consistently):**
- **Market the clean "$4/mo"** everywhere — it's cheap-feeling and frictionless. But *deliver* it through the **annual** plan ($48/yr). This locks in a year of revenue and kills churn (monthly subscriptions churn brutally — people cancel after ~2 months).
- The **$6 monthly** exists mainly as an *anchor* — it makes the annual plan look like the obvious deal, so most people pick annual.
- The **$79 lifetime deal** runs **launch week only, capped at the first 500 buyers.** It gives the Product Hunt / Reddit / indie-hacker crowd a reason to buy *on day one*, creates urgency, and injects launch cash with zero ad spend. **Retire it after launch** — never permanent, or it cannibalizes subscriptions.
- **14-day trial, card required, auto-converts.** Shorter trial = urgency = better conversion (Quoril shows value day one via the first screen-time report). Requiring a card filters for real intent and roughly doubles conversion vs. no-card trials. Send "trial ending in 3 days" + "last day" emails — that's where conversions happen.
- **Why $4 and not higher:** this is a first product whose #1 job is building a base. Cheap price = more trials = more word-of-mouth, which is exactly what an organic, no-budget launch needs. You can raise prices later and grandfather early users (they love that).
- No permanent free tier at launch (keeps it premium); the trial is the free taste.

**The funnel right now (pre-launch):**

```
Content (IG / Reddit / LinkedIn / X)
        ↓
Landing page (quoril — see naming note below)
        ↓
Join Waitlist (email + role + platform)
        ↓
Confirmation email (Resend) → nurture sequence
        ↓
LAUNCH DAY → early-access invite → start 14-day trial → convert to $4/mo
```

> **Domain / naming note for the marketer:** The public site currently runs on a `.in` domain. **This is acceptable for the initial launch** — getting first users/funding comes first, and a good product gets trials regardless of TLD. The critical thing to scrub is **₹ prices and IST times**, NOT the TLD itself (a `.in` is far less damaging than rupee pricing). *If at all affordable (~$10–15/yr):* buy a neutral `.com`/`.app` and simply **redirect** it to the current site — 10-minute setup, no rebuild. Otherwise, **migrate the domain as Priority #1 the moment any revenue arrives.** Don't let the domain block the launch.

**Waitlist goal for pre-launch:** Aim for **2,000–5,000 quality emails** before launch. A focused solo operator doing the plan below can realistically hit 1,000–3,000 in 8–12 weeks.

---

## 3. Messaging & Copy Bank (use these — don't reinvent)

### Primary positioning statement
> **Quoril is the desktop command center for deep work. Plan your day, lock into focus, and get an honest report of where your time actually went — privately, on your own machine.**

### Taglines (rotate across channels)
- "Deep work, fully tracked."
- "Plan it. Focus on it. Prove you did it."
- "Know where your time goes. Then take it back."
- "Tasks, focus, and screen time — one command center."
- "Stop guessing where your day went."
- "Built for people who ship."

### The "enemy" / problem hooks (these drive engagement — lead with pain)
- "You planned 6 hours of deep work. You actually did 90 minutes. Your tools never told you."
- "Your task app doesn't know if you focused. Your time tracker doesn't know what you planned. So neither do you."
- "Three apps to plan, focus, and track your time. Quoril is one."
- "Most productivity apps make you *feel* productive. Quoril shows you the truth."
- "RescueTime tells you that you wasted 3 hours. It never helped you not waste them."

### Audience-specific angles
| Audience | Hook |
|---|---|
| Developers / engineers | "Stop context-switching between 14 apps and wondering why the day's gone. See your real focus time per task." |
| Indie hackers / founders | "Ship more. Quoril shows you exactly how much deep work you actually did this week." |
| Students | "Study sessions that you can actually prove happened. Beat the doomscroll." |
| Freelancers / consultants | "Real time tracked per task — bill accurately without a stopwatch." |
| Privacy-minded users | "Your productivity data never leaves your machine. No cloud surveillance. Offline-first." |

### Words to USE
deep work, focus, command center, private, offline-first, honest, real time tracked, ship, native, desktop, reclaim your time, distraction, context-switching, productivity score.

### Words to AVOID
habit tracker, Indian, ₹/rupees, cheap, simple to-do list, "best app ever," spam-emoji stacks, "limited time offer."

---

## 4. Brand & Visual Guidelines (so all content looks like one product)

- **Primary color:** Lime green `#c4f82a`
- **Background:** Near-black / onyx (`#0a0a0a`-ish)
- **Secondary accents:** Violet `#6366f1`, Focus Blue `#2b6bf5`, Break Orange `#f5a623`, Teal `#10c49a`
- **Fonts:** Poppins (headings), Inter (body)
- **Aesthetic:** "Big-rounded bento" tiles, dark, high-contrast, clean — Linear/Vercel energy
- **Logo:** "Quoril." with the dot as a lime accent

**Visual rules for the marketer:**
- Every graphic = dark background + lime accent. Consistency builds recognition.
- Use real product screenshots (the focus pill, the screen-time heatmap, the Kanban board) — these *are* the marketing. The product looks good; show it.
- Screen recordings > static images for this product (the floating pill and live timer are inherently motion-friendly).
- Keep text overlays minimal and in Poppins/Inter or close equivalents.
- **Before publishing any screenshot:** scrub it for any rupee symbol (₹), IST timestamps, or personal/test data. (The `.in` domain itself is OK to show for now — but if a neutral redirect domain is live, prefer showing that.)

---

## 4.5. Locked Strategic Decisions (read before the playbooks)

These four are decided — execute against them, don't re-litigate:

| Decision | Choice | What it means day-to-day |
|---|---|---|
| **Beachhead audience** | **Developers / indie hackers FIRST** | Lead every message with privacy/offline-first + "real focus time per task / ship more." Concentrate on Reddit, Hacker News, X. Expand to students/freelancers only *after* this base is winning. |
| **Founder presence** | **Brand-only — no personal face or real name** | Everything posts as **"Quoril" / "the Quoril team" / "we."** No founder selfie, no personal identity revealed. *Optional:* use a neutral, human brand-persona first name for account voice (e.g. "Alex from Quoril") to keep posts feeling human — this is a brand persona, used consistently. Credibility comes from the product, demo videos, and beta testimonials, NOT from a founder. The privacy/offline-first positioning carries the trust that founder-transparency usually would. |
| **Assets** | **None ready — Week 0 asset sprint required** | A demo video and beta testimonials are hard blockers. See Roadmap Week 0. No campaign launches before these exist. |
| **Domain** | **Launch on existing `.in` for now; migrate later** | Changing the domain is NOT a launch blocker — we need first users/funding first. A `.in` TLD costs a little perceived premium-ness but will NOT stop a good product from getting trials. The real things to scrub are **₹ and IST**, not the TLD. *Cheap option:* a neutral `.com`/`.app` is only ~$10–15/yr and can simply *redirect* to the current site (10-min setup, no rebuild) — do this if at all affordable. Otherwise, migrate the domain as **Priority #1 the moment any revenue comes in.** |
| **Timeline** | **Launch ASAP (~4–6 weeks)** | Use the compressed 5-week roadmap (Section 7), not a long slow burn. Bias to shipping content fast and iterating live. |

---

## 5. THE CHANNEL PLAYBOOKS

You have a **small team and no budget (organic only)**. With more than one person you CAN run all four channels in parallel — but they still rank by impact for *this* product. Assign owners (Section 5.5) and weight effort accordingly:

> **Impact priority: Reddit (#1 for this exact product) → X/Twitter (build-in-public) → Instagram → LinkedIn.**
> Reddit and X are where developers and productivity nerds actually hang out and where a desktop focus tool spreads. Instagram drives broad reach via Reels; LinkedIn reaches higher-income professionals. With a team, give Reddit + X your strongest people, and run IG + LinkedIn in parallel rather than as afterthoughts. Channel owners follow the team cadence in Section 6.

---

### 5A. REDDIT — Your #1 channel (highest-intent users live here)

Reddit is where a privacy-first desktop productivity tool can genuinely go viral with zero budget. But Reddit **punishes** self-promotion. The strategy is: **be a real, helpful member first; let people discover the product.**

**The Golden Rule:** Spend 90% of your Reddit effort being genuinely helpful and 10% mentioning Quoril. If your account looks like an ad, you'll be banned and the brand gets a bad name.

**Subreddits to live in (join all, read the rules of each):**
| Subreddit | Why | Approx vibe |
|---|---|---|
| r/productivity | Core audience | Big, strict on self-promo |
| r/getdisciplined | People actively fighting distraction | Very engaged |
| r/ADHD & r/ADHD_Programmers | Focus tools are *gold* here — huge unmet need | Sensitive, be respectful & genuine |
| r/macapps | Mac users love new native apps | Promo-friendly if done right |
| r/Windows / r/windowsapps | Windows desktop tools | Smaller but on-target |
| r/SideProject & r/indiehackers | Build-in-public friendly | Promo-tolerant |
| r/somethingimade / r/coolgithubprojects | Show the build | Show-and-tell ok |
| r/Notion, r/todoist (carefully) | People frustrated with current tools | Don't bash competitors |
| r/selfimprovement, r/DecidingToBeBetter | Broader self-improvement | Story-driven posts |

**Account setup:** Use one real, named account (not "QuorilApp" — that screams brand). Build karma for 2–3 weeks before mentioning the product at all. Comment helpfully on 5–10 threads daily.

**The 3 post types that work on Reddit (with templates):**

**Type 1 — The "I built this to solve my own problem" story (best for r/SideProject, r/indiehackers, r/macapps):**
> **Title:** I got tired of planning 8 hours of deep work and having no idea if I actually did it — so I built a desktop app that tracks the whole loop
>
> Body: Short, honest story. "I'd plan my day in Todoist, try to focus, then have no clue at 6pm where the time went. RescueTime told me I wasted time but never connected it to what I planned. So I built [Quoril]: it's a desktop app that does the Kanban planning, a focus timer + a floating pill that stays on top of every app, AND automatically (privately, all on-device) tracks where your time actually went. Here's a screenshot of the screen-time report. Happy to answer anything / would love feedback." + 1 screenshot.

**Type 2 — The pure-value post (no product, builds your reputation):**
> **Title:** After 6 months of tracking every app I used, here's what actually killed my focus (and what fixed it)
>
> Body: Genuinely useful insights. Mention the *category* of tool casually at the end ("I built a small tool to do this automatically, link in profile if anyone wants it" — only if the sub allows). The value IS the post.

**Type 3 — Helpful comment (your daily bread):**
> Someone asks "what's a good way to stop context-switching?" → give a real, thoughtful answer. Only at the end, *if relevant*: "I actually built a desktop app around exactly this — DM me if you want it, don't want to spam the thread."

**Reddit do's and don'ts:**
- ✅ DO read each subreddit's self-promotion rules before posting.
- ✅ DO respond to every comment on your posts within the first 2 hours (drives the algorithm).
- ✅ DO post screenshots/GIFs — visual posts dominate.
- ✅ DO link the waitlist in your profile bio, not always in the post.
- ❌ DON'T post the same thing to 10 subreddits the same day (= spam ban).
- ❌ DON'T argue or get defensive. Thank critics.
- ❌ DON'T ever mention India/rupees. Prices in USD only.

---

### 5B. X / TWITTER — Build in Public (compounds over months)

X is the home of the indie-hacker / dev-tool / productivity community. The play is **"build in public"** — share the journey, the product, the metrics, the design. This builds an audience that becomes your launch-day army.

**Profile setup:**
- Bio: "Building Quoril — the desktop command center for deep work. Plan → focus → see where your time actually went. Privately, on your machine. 🟢 Join the waitlist 👇"
- Pinned tweet: A 30–60s screen recording demoing the focus pill + screen-time report, ending with the waitlist link.
- Banner: Dark, lime accent, tagline.

**Content pillars (rotate):**
1. **Product clips** (40%) — short screen recordings of features. The floating focus pill, the heatmap filling in, completing a task with confetti. These are inherently shareable.
2. **Build-in-public** (25%) — "Just shipped the Pomodoro break tracker." "Waitlist hit 500 today." Share real numbers — people root for transparent builders.
3. **Insights/hot takes** (25%) — "Most productivity apps optimize for feeling busy, not for shipping. Here's the difference." Pure-value threads about focus/deep work.
4. **Engagement** (10%) — reply to big productivity/dev accounts, ask questions, run polls.

**Tactics:**
- Post 1–3x/day. Consistency > volume.
- Reply to bigger accounts (productivity gurus, indie hackers, dev influencers) with genuinely smart comments — this is how you get discovered with 0 followers.
- Use threads for insight content; single clips for product.
- Hashtags barely matter on X — focus on the first line (the hook) and the visual.
- Engage with #buildinpublic and #indiehackers communities.
- When the waitlist hits milestones (500, 1k), tweet it — milestones get reshared.

**Sample tweets:**
> "I tracked every app I opened for 30 days.\n\nI *thought* I did 5 hrs of deep work a day.\n\nReality: 2 hrs 10 min.\n\nThe gap was 14 micro context-switches an hour I never noticed.\n\nBuilt a tool that shows you this automatically. 🧵👇"

> "New in Quoril: a focus pill that floats over every app so your current task + timer is always visible. No more 'wait, what was I doing?'\n\n[15-sec screen recording]"

---

### 5C. INSTAGRAM — Visual proof + reach (supporting channel)

Instagram is for **reach and credibility through polished visual/video content.** A dark, sleek productivity app is very "aesthetic" — it fits IG well. Reels are the growth engine.

**Account setup:**
- Handle: @quoril (or @quoril.app)
- Bio: "Deep work, fully tracked. 🟢\nThe desktop command center for focus.\nPlan → Focus → See where your time went.\n👇 Join the waitlist"
- Link: Waitlist (use a clean link-in-bio).
- Highlights: "Features", "Focus", "Screen Time", "Behind the build".

**Content types (Reels are 70% of effort):**
1. **Reels — product demos** (the winner): 7–15 sec, satisfying. The focus pill appearing, the heatmap animating, a task completing with confetti, theme-switching. Trending audio + clean caption.
2. **Reels — relatable problem skits / text-over-screen:** "POV: it's 6pm and you have no idea what you did all day" → cut to Quoril's report. These pull big reach.
3. **Carousels — value posts:** "5 signs you're busy but not productive" / "How to actually do deep work" — slide 1 hook, slides 2–6 value, last slide soft CTA. Dark + lime, on-brand.
4. **Stories — daily:** polls ("how many hours of *real* focus did you do today?"), behind-the-build, countdowns to launch.

**Tactics:**
- Post 3–5 Reels/week + daily Stories. Reels are where new audience comes from.
- Hook in the first 1 second (text + motion). 50% of the battle is the first frame.
- Use 3–5 relevant hashtags: #deepwork #productivity #focus #buildinpublic #productivityapp #indiedev — don't stuff 30.
- Reply to every comment; DM people who show interest with the waitlist link.
- Engage 15 min/day on other productivity creators' posts to get discovered.
- Repurpose your X product clips here and vice versa — same asset, two channels.

---

### 5D. LINKEDIN — Authority + B2B/professional reach (supporting channel)

LinkedIn reaches a slightly older, professional, higher-income audience (managers, consultants, knowledge workers) — exactly the people who'll happily pay $4/mo for focus and may bring teams later. Tone here is professional but human.

**Setup:**
- **Brand-only here too** — since we're not revealing a founder, post from the **Quoril company page**, and have *team members* (anyone on the marketing team, under their own real profiles) reshare/comment to extend reach. Company pages reach less than personal profiles, so lean on team members amplifying each post. Do NOT fabricate a fake founder persona on LinkedIn (LinkedIn is identity-based and fake profiles get flagged) — the brand persona trick is fine for X/Reddit, not LinkedIn.
- Company headline: e.g. "Quoril — helping knowledge workers reclaim deep focus | Productivity software"

**Content (post 3–4x/week):**
1. **Story/lesson posts:** "I measured where my workday actually went for a month. The result changed how I work. Here's what I learned." (Narrative, value-first, soft mention of Quoril at the end.)
2. **Insight posts on focus/productivity at work:** context-switching cost, the myth of multitasking, deep work for teams.
3. **Build-in-public, professional framing:** "We just crossed X on the waitlist. Here's what we're learning about how knowledge workers actually want to track focus."
4. **Document/carousel posts** (LinkedIn loves PDFs/carousels): "The real cost of context-switching" with clean dark-brand slides.

**Tactics:**
- Hook in the first 2 lines (LinkedIn truncates — make them click "see more").
- Short paragraphs, lots of white space.
- End with a question to drive comments (comments = reach).
- Engage with productivity/future-of-work thought leaders' posts.
- No hashtag stuffing — 3 max.
- CTA to waitlist in comments or a soft "link in profile," not aggressively in-post.

---

## 5.5. Team Roles (organic, no budget — divide and conquer)

You have a team but no money, so the lever is **division of labor + volume**, not ad spend. Assign clear owners so nothing falls through and the brand voice stays consistent. Adapt to your actual headcount — if you have 2 people, combine roles; if 4+, split fully.

| Role | Owns | Profile of person |
|---|---|---|
| **Content Lead / Editor** | Brand voice, the copy bank (§3), approving anything before it ships, keeping everything premium + India-scrubbed. The single "voice owner." | Strong writer, good taste |
| **Reddit + X owner** (most important seat) | Daily Reddit karma + posts, the X build-in-public account, replying to comments. This is where intent lives — put your best community person here. | Genuine, conversational, dev/productivity-fluent |
| **Visual / Reels owner** | Captures product screen recordings, edits Reels + carousels, runs Instagram, maintains the asset bank. | Editing/design skill, fast turnaround |
| **LinkedIn + outreach owner** | Founder-voice LinkedIn posts, engaging with thought leaders, light DM outreach to relevant communities/creators for organic shoutouts. | Professional tone, networker |

**Shared rituals:**
- One **shared content calendar** (a simple sheet/Notion) — every post planned a week ahead so channels stay coordinated (e.g. a launch milestone hits all 4 channels the same day).
- One **shared asset bank** (Drive folder) of product clips/screenshots everyone repurposes.
- A **weekly 30-min sync** to review what's working (Section 9 metrics) and shift effort to the winning channel.
- The Content Lead reviews anything sensitive before it ships. Everyone follows the 3 rules at the top.

---

## 6. The Weekly Operating Cadence (team version — organic, no budget)

With a team, you run all four channels in parallel. Each owner runs their channel daily; the whole team feeds one shared asset bank. Roughly 2–3 focused hours/day per person.

**Daily, per owner:**
- **Reddit + X owner:** 30 min Reddit (comment on 5–10 threads, reply to your post comments) + 30 min X (1–3 clips/tweets, reply to 10 bigger accounts).
- **Visual / Reels owner:** capture/edit and ship 1 Reel or carousel; run IG engagement 15 min (reply to comments/DMs).
- **LinkedIn owner:** engage 15 min with thought leaders + ship LinkedIn posts on the calendar.
- **Content Lead:** produce/approve the day's "hero" asset and keep the calendar moving.

**Weekly team targets (higher than solo — you have the hands):**
- 5–7 Instagram Reels
- 2–4 high-effort Reddit posts (different subs, different days, different accounts — never the same post spammed)
- 4–5 LinkedIn posts
- 15–25 X posts/clips
- 2 "value" long-form pieces (threads/carousels) repurposed across all channels

> **No-budget multipliers (use these instead of ad spend):** organic creator/community shoutouts (DM relevant micro-creators offering free lifetime access in exchange for an honest post), cross-posting to relevant Discord/Slack communities where allowed, getting feated on free "new tools" newsletters and directories (e.g. submit to free indie-tool roundups), and turning every waitlist milestone into shareable content. Volume + authenticity is your paid-ads replacement.

**Content repurposing engine (critical for solo sustainability):**
Make ONE thing, ship it 4 ways:
```
One product screen-recording →
   → X clip
   → Instagram Reel (add trending audio)
   → Reddit post (with "I built this" framing)
   → LinkedIn (with professional lesson framing)
```
One insight →
```
   → X thread
   → Instagram carousel
   → LinkedIn document post
   → Reddit value post
```
Never create for one channel only.

---

## 7. The Compressed 5-Week Pre-Launch Roadmap (launching ASAP)

> **Context:** Beachhead = **developers / indie hackers**. Founder presence = **brand-only** (no personal face/name; post as "Quoril / the team / we"). **No assets exist yet**, so Week 0 is an asset sprint — campaigns can't start until the basics exist. Target launch: ~5 weeks out.

**Week 0 (the asset sprint — DO THIS BEFORE ANY CAMPAIGN)**
These are hard blockers. Nothing public-facing ships until they're done:
- [ ] **Domain:** launch on the existing `.in` for now (NOT a blocker). *If affordable (~$10–15):* buy a neutral `.com`/`.app` and redirect it to the current site. Otherwise migrate post-revenue. **Scrub ₹ and IST everywhere** — that's the real requirement, not the TLD.
- [ ] **Produce one polished 30–60s demo video** — focus pill floating over apps + the screen-time report filling in. This is your single most-reused asset; everything keys off it.
- [ ] **Capture 10–15 raw product clips/screenshots** (Kanban, heatmap, reports, theme switch) for the asset bank.
- [ ] **Recruit 10–20 beta users** (from warm network / dev communities) → get 3–5 honest testimonials/quotes for social proof. Critical for the dev audience.
- [ ] Set up accounts on-brand (Section 4): Quoril X + IG + LinkedIn company page (all brand-only, no personal accounts).
- [ ] Start **Reddit karma-building immediately** (helpful comments only, no promo) so accounts are warm by Week 2.

**Week 1 — Ignition (dev-first)**
- Begin daily cadence (Section 6).
- First "I built this to solve my own problem" Reddit post in **r/SideProject** + **r/indiehackers** (different days). Lead with the privacy/offline-first + "real focus per task" angle.
- Quoril (brand) starts build-in-public on X (the journey, the why, the demo clip) — posted as "we / the Quoril team," no personal identity.
- Goal: 0→200 waitlist.

**Week 2 — Reach + reputation**
- Reddit value posts in **r/productivity**, **r/getdisciplined**, **r/ADHD_Programmers** (genuine value, soft mention).
- Push the demo clip as Reels on IG + clips on X daily.
- Engage hard with bigger dev/productivity accounts for discovery.
- Goal: ~500–800 waitlist.

**Week 3 — Momentum + launch prep**
- Aim for 1–2 posts to "hit." Double down on whatever channel is winning (Section 9).
- Prep the **Product Hunt** + **Hacker News "Show HN"** assets (gallery = your clips; copy ready).
- Line up beta testimonials to post.
- Goal: ~1,000–1,500 waitlist.

**Week 4 — Launch run-up & urgency**
- Announce the launch date everywhere. Countdown in Stories + pinned tweets.
- "Early access + launch-week $79 lifetime deal (first 500)" messaging — make the waitlist feel valuable and time-boxed.
- Email the waitlist to prime them for launch day.
- **Launch (end of Week 4 / Week 5):** Product Hunt + Show HN + coordinated 4-channel push (Section 8).
- Goal: 1,500–2,500 waitlist converted into launch-day trials.

---

## 8. Launch-Day Plan (when product goes live)

- **Product Hunt launch** (Tuesday–Thursday, 12:01am PT). This is the single biggest organic spike for a dev/productivity tool. Prep: great gallery (your screen recordings), a clear tagline, the team available all day (replying as "Quoril") to every comment, and your waitlist emailed at launch to upvote/comment in the first 2 hours. Aim for "Product of the Day."
- **Email the waitlist** with their early-access invite + "your 14-day free trial starts now."
- **Coordinated posts** across all 4 channels same day, all driving to download.
- **Reddit:** a genuine "we just launched after X months of building — here's the story" post in r/SideProject, r/indiehackers, r/macapps.
- **Hacker News** "Show HN: Quoril – a private desktop app that plans, focuses, and tracks where your time actually went." (HN loves privacy-first, offline-first, native desktop tools — strong fit.)
- Have testimonials from trial/beta users ready to post.

---

## 9. Measurement — Track These Weekly

| Metric | Why | Target trend |
|---|---|---|
| Waitlist signups (total + weekly new) | The #1 pre-launch metric | Up every week |
| Signups by source (ask "where'd you hear about us?" or use UTM links) | Tells you which channel to double down on | Identify winners by week 4 |
| Reddit post upvotes + saves | Save rate = real intent | Find your repeatable post format |
| X/IG follower growth + best-performing post | Audience compounding | Steady up |
| Reel reach + watch-through | IG's growth signal | Improve hooks |
| Email open rate on waitlist nurture | Audience quality | >40% open |

**The rule:** By week 4, identify the 1–2 channels giving the most signups and shift more time there. Don't keep all 4 at equal effort if Reddit (likely) is winning.

---

## 10. Competitor Notes (know the landscape, never bash them)

- **Blitzit** — closest competitor on focus + tasks. Quoril's edge: deeper *automatic* screen-time analytics + offline-first privacy + cross-platform desktop. Frame Quoril as "the focus tool that also shows you the truth about your time."
- **Rize / RescueTime** — time trackers. Edge: they only *report*, they don't help you *plan and focus*. Quoril closes the loop.
- **Todoist / TickTick** — task managers. Edge: they don't know if you actually focused or where time went.
- **Sunsama** — premium daily planner ($16–20/mo). Edge: Quoril is a fraction of the price *and* adds automatic tracking + a native focus widget. Strong "premium experience, smarter price" angle.
- **Forest / Freedom** — blockers. Edge: Quoril gives real analytics + task integration, not just blocking.

**Never** publicly trash a competitor. Position by contrast: "X is great at one thing. Quoril does the whole loop." Classy beats catty, and it protects the premium brand.

---

## 11. Quick-Start Checklist (give this to the marketer day 1)

- [ ] Domain: launch on `.in` is fine for now. *If affordable (~$10–15):* buy a neutral `.com`/`.app` and redirect to the current site. Migrate fully post-revenue. *(NOT a launch blocker.)*
- [ ] Scrub every screenshot/asset for ₹, IST, and test data. *(The `.in` TLD is OK to show for now.)*
- [ ] Set up X, Reddit, Instagram, LinkedIn accounts on-brand (dark + lime, taglines from §3).
- [ ] Build asset bank: 10–15 product screen recordings.
- [ ] Start Reddit karma-building (helpful comments, no promo, 2–3 weeks).
- [ ] Pin a demo video + waitlist link on X and IG.
- [ ] Begin daily cadence (§6).
- [ ] Set up UTM links / "how'd you hear about us" so you can track sources.
- [ ] Track waitlist weekly; review winning channel at week 4.
- [ ] Prep Product Hunt + Hacker News for launch day.

---

*Everything an organic, no-budget marketing team needs is in this document. Assign owners (Section 5.5), execute Section 6 daily, follow the roadmap in Section 7, and route everything to the waitlist. Keep it premium, keep it global, keep it consistent.*
