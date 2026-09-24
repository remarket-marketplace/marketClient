# Current Deal Modal Redesign Plan

## Goal
Make the "Current deal" modal clearer, calmer, and easier to act on by improving hierarchy, reducing visual noise, and making states more explicit.

## Success Criteria
- Primary action is obvious in under 2 seconds.
- User can understand deal status and next step without reading long text.
- Visual load is reduced (fewer competing accents/badges/glows).
- Mobile layout remains readable and tap-friendly.

## Scope
- Route/component: current deal modal block in chat flow.
- Keep existing business logic and actions.
- Focus on UI structure, copy, spacing, and states.

## Constraints
- Preserve current design system tokens/colors where possible.
- No backend/API changes in phase 1.
- Avoid breaking existing localization keys unless necessary.

## Baseline Problems (Now)
1. Too many badges in one row; weak prioritization.
2. Product title and metadata compete visually.
3. Secondary destructive/report action is too prominent.
4. Status progression is implicit; users may not understand what happens next.
5. Decorative glow/gradient competes with content.

## Implementation Phases

### Phase 1: Quick Wins (Low risk, high impact)
1. Simplify top badge row:
- Keep only order ID and timer chip.
- Move seller execution status to a compact status line with icon.

2. Clarify hierarchy:
- Increase product title prominence.
- Reduce contrast/weight of "product data" section label.

3. Rebalance actions:
- Keep "Confirm receipt" as primary button.
- Convert "Report" to ghost/tertiary style.

4. Tone down background effects:
- Reduce glow opacity and blur.
- Keep one subtle accent instead of layered highlights.

### Phase 2: State Communication
1. Add mini progress/timeline:
- Paid -> Delivered by seller -> Confirmed by buyer.
- Highlight current step; keep previous steps subdued.

2. Improve timer UX:
- Compact format (`47h 46m`).
- Tooltip/full text on desktop if needed.

3. Add contextual helper text:
- Under primary action when seller marked delivered:
  "Check product details before confirming receipt."

### Phase 3: Interaction Polish
1. Add hover/focus consistency for chips and buttons.
2. Improve disabled states contrast and affordance.
3. Add micro-animation only where meaningful (status transition), respecting reduced motion.

### Phase 4: Mobile Pass
1. Stack metadata and actions for thumb reach.
2. Ensure min touch targets 44px.
3. Keep chips to one row with overflow strategy or wrap rules.

## UX Copy Suggestions (RU)
- Timer chip: `Автоподтверждение через 47ч 46м`
- Helper text: `Проверьте данные товара перед подтверждением получения.`
- Status line: `Выдано продавцом`

## Technical Checklist
- [ ] Identify exact Vue component and style scope.
- [ ] Create small visual spec (spacing/typography/chip variants).
- [ ] Implement phase 1 changes behind same markup contract where possible.
- [ ] Validate desktop + mobile breakpoints.
- [ ] Validate hover/focus/disabled states.
- [ ] Confirm no regressions in dark theme.
- [ ] Optional: add screenshot diff for before/after in PR.

## Rollout Strategy
1. Ship phase 1 in one PR.
2. Collect quick feedback from team/stakeholders.
3. Ship phase 2 as iterative PR.
4. Final polish (phase 3/4) after validation.

## Definition of Done
- New layout merged.
- Actions and status are visually unambiguous.
- No layout break at common breakpoints.
- QA checklist passed on latest `dev` branch.

## Notes
This plan is intentionally incremental so we can improve UX without pausing delivery or rewriting the component.
