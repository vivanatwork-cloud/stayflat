# Moon-Cycle Performance Specification

## Goal

Add a report section that compares a trader's completed-position performance across the two halves of each lunar cycle.

## Period definitions

- **New Moon period:** begins at the exact new-moon time and ends immediately before the next full moon.
- **Full Moon period:** begins at the exact full-moon time and ends immediately before the next new moon.
- Each half lasts roughly 15 days; the exact length comes from the astronomical event times.
- Classify a completed position using its close time. This matches StayFlat's existing realized P&L and daily-performance calculations.
- Use exact UTC event times for classification. The user's timezone is only used when displaying dates.

## Measures

For each period show:

- Net realized P&L after recorded fees
- Win rate
- Average net result per completed position
- Number of completed positions

The comparison must work for each wallet, each available exchange tab, the combined-exchange tab, and the all-wallet portfolio.

## Interpretation and low-data rules

- Show the raw figures whenever the period contains at least one completed position.
- Name a better-performing period only when both periods contain at least five completed positions.
- Below that threshold, show: “Not enough completed positions for a reliable comparison.”
- Always show: “This is an observed timing pattern, not evidence that moon phases caused the result.”
- If a saved report predates this feature, show a refresh action instead of invented or partial figures.

## Phase calculation

- Calculate phase boundaries locally with the free, MIT-licensed `astronomy-engine` package.
- Use `SearchMoonQuarter` and `NextMoonQuarter`; keep quarter `0` as new moon and quarter `2` as full moon.
- Do not call, scrape, or pay for an external moon-phase service.
- Generate boundaries for the report's date range plus one event on either side, so every completed position can be classified.
- Keep Timeanddate only as a manual accuracy reference: `https://www.timeanddate.com/moon/phases/`.

## Interface direction

The trader has already read the main report and is looking for another behavioral pattern. The section should feel analytical and restrained, like a field note—not mystical or predictive.

- Domain: lunar cycle, phase boundary, realized position, comparison, sample size, timing pattern.
- Color world: StayFlat paper, ink, fine rules, muted silver, one moonlit blue-gray accent.
- Signature: a thin two-part lunar-cycle strip that shows New Moon period → Full Moon period and makes the boundary rule visible.
- Avoid: astrology imagery, glowing gradients, decorative star fields, and a generic pair of unrelated metric cards.

Place the section after the P&L calendar and trading rhythm, before the existing detailed observations.
