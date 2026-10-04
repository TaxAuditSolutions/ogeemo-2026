# Ogeemo Global Help & Learning Standard

Adopted from the beta tester's proposal (2026-10). The interface should explain
itself first. Help is available when needed, never imposed before it is needed.

## The help flow

    Clear interface → optional ? help → Learn more → Learn Ogeemo

Not: Screen → Instructions → About → Pop-up → Hide.

## Three levels of help

### Level 1 — The interface itself
Familiar terminology, clear button names, logical hierarchy, consistent icons.
Do not add instructions because the interface is unclear — fix the interface.

### Level 2 — Contextual `?` help (`<HelpTip>` component)
- Only where explanation is genuinely useful — not on every control
- Opens only when the user selects it; never auto-opens
- Short: **What is this? Why would I use it? What do I do next?** (≤ 3 sentences)
- Easy to close; never reopens by itself after dismissal
- Ends with a `Learn more →` link into the relevant Learn Ogeemo topic

### Level 3 — Learn Ogeemo (`/learn`)
- The single home for all teaching: the guided path (foundations) plus the
  guide library (`/learn/guides/*`) for every tool
- Deep-linkable: `/learn?topic=<step-id>` scrolls to a foundation step;
  `Learn more →` links land on the exact guide chapter
- Anything longer than a `?` answer belongs here

## Hard rules

1. **No auto-opening help** — no About windows, instructional pop-ups, welcome
   tutorials, or large explanatory panels that open by themselves. The only
   exception is must-know information (required first-time setup, warnings).
2. **No permanent About buttons on work screens** — if a screen needs an
   About button, fix the labelling/hierarchy first; then add `?` help.
3. **No instructional copy on work screens** — "How to Use…" panels/cards live
   in Learn Ogeemo; the screen links to them.
4. **No new prose tooltips** — hover tips are a legacy, opt-in layer
   (Settings → Preferences → Button Tips). New explanatory content goes into
   `<HelpTip>` or Learn Ogeemo, never into new tooltips.
5. **Contextual, not generic** — help always links to the topic for the screen
   the user is on. Never send users to a generic help index to search again.
6. **Plain language** — the user learns to run their business, not an extra
   vocabulary. Prefer "Record an activity" over "Capture a signal". Enforced
   for retired terms by `tests/naming-guard.test.ts`; style words (e.g.
   "sculpt", "signal"-as-jargon) are banned in new copy.

## Architecture map (as migrated, 2026-10)

| Content | Lives at | Notes |
|---|---|---|
| Guided path (8 steps) | `/learn` | Deep-link: `?topic=<step-id>` |
| All tool guides (17) | `/learn/guides/<slug>` | Formerly 16 scattered `/…/instructions` routes + the inline Inventory card; old routes 302-redirect via `next.config.js` |
| Help index | `/help` | Doorway to Learn; keeps the guide directory + principles |
| Contextual help | `<HelpTip>` (`src/components/ui/help-tip.tsx`) | Placed only on priority screens: My Shortcuts, Customize Shortcuts, Invoices, Calendar |
| Hover tips | `ui/tooltip.tsx` behind `showButtonTips` | Frozen: no new prose tooltips |

## Migration backlog (as screens are reviewed)

- [ ] Ledgers "About BKS" teaching dialog (click-opened, compliant with rule 1)
  — content ideally folds into the bookkeeping guide eventually
- [ ] Sweep remaining `Info`-icon links to confirm each points at its own
  screen's guide (they do today; keep it that way)
- [ ] Extend guard tests as new screens land — `tests/help-standard-guard.test.ts`
- [ ] Measure which `?` tips actually open once analytics are available; add
  tips only where data shows confusion
