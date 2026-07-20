# Contract: Person Card Living/Deceased + Gender-on-Avatar Styling

File: `src/features/tree/IndividualNode.tsx`. New tokens: `src/styles/theme.css`.

## New CSS custom properties (`theme.css` `@theme` block)

```text
--color-card-living-border
--color-card-living-bg
--color-card-deceased-border
--color-card-deceased-bg
```

Exact hex values are a visual-design decision (spec Assumptions) — implementation picks values that keep both states legible against the app's existing `--color-surface` (#fffaf0) page background and against arbitrary visitor-chosen tree backgrounds (spec Edge Cases: cards must stay distinguishable primarily via border, not background fill alone).

## Outer card `<div>` — living/deceased (FR-001)

Before:
```text
className="... rounded-xl bg-[var(--color-surface-raised)] p-3 ..."
style={{ borderTop: `4px solid ${genderBorderColor[individual.gender]}` }}
```

After: the outer card's `style` no longer sets `borderTop` from gender. Instead, a `cardStatusStyle: Record<boolean, { border: string; background: string }>` keyed by `individual.isDeceased` supplies a full-border + background pair:

```text
style={{
  border: `2px solid ${individual.isDeceased ? "var(--color-card-deceased-border)" : "var(--color-card-living-border)"}`,
  backgroundColor: individual.isDeceased ? "var(--color-card-deceased-bg)" : "var(--color-card-living-bg)",
}}
```

The `bg-[var(--color-surface-raised)]` Tailwind class is removed from `className` (superseded by the inline `backgroundColor` above, which must win regardless of custom canvas background — spec Edge Cases).

## Avatar `<div>` — gender (FR-002)

Before:
```text
className="mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[var(--color-brand-50)] ..."
```
(no border; gender was on the card, not here)

After: the existing `genderBorderColor: Record<Individual["gender"], string>` map (unchanged values — spec Acceptance Scenario US1.4: "same gender-color distinction ... just relocated") is applied here instead of on the card:

```text
style={{ border: `3px solid ${genderBorderColor[individual.gender]}` }}
```

`bg-[var(--color-brand-50)]` stays — the border is additive, doesn't replace the avatar's existing fill/initials background.

## Unaffected (FR-003)

No change to: the sibling-order badge, the two `Handle` elements, the name `<p>`, the expand/collapse button, `onSelect`/`onClick` wiring, or the card's fixed `h-[150px] w-[200px]` sizing (kept in sync with `useTreeLayout`'s `CARD_WIDTH`/`CARD_HEIGHT`).
