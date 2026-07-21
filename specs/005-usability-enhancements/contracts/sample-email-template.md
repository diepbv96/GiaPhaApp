# Contract: sample email template default

**Module**: new exported constant in `src/features/notifications/notificationConfigService.ts` (co-located with the type/service it seeds), consumed by `src/features/notifications/NotificationSettingsPanel.tsx`.

## Constant

```ts
export const DEFAULT_EVENT_REMINDER_TEMPLATE =
  "Kính báo: {{ten_ca_nhan}} sẽ có {{loai_su_kien}} vào ngày {{ngay_duong}} ({{ngay_am}}), còn {{so_ngay_con_lai}} ngày nữa.";
```

Uses exactly the five variable names `send-event-reminders/logic.ts`'s `renderTemplate()` already substitutes (`ten_ca_nhan`, `loai_su_kien`, `ngay_duong`, `ngay_am`, `so_ngay_con_lai` — `logic.ts:143-149`), each appearing exactly once, so the sample renders correctly if saved completely unmodified (FR-021).

## Resolution rule (`NotificationSettingsPanel.tsx`)

```ts
const [template, setTemplate] = useState(config.template === "" ? DEFAULT_EVENT_REMINDER_TEMPLATE : config.template);
```

- `config.template === ""` (today's only-possible "never configured" state — research.md §4) → textarea starts pre-filled with the sample.
- Any other value (including a previously-saved, deliberately-blank-then-saved value — see research.md §4 Alternatives) → textarea starts with that saved value, unchanged (FR-020).
- Saving (`updateConfig`) always persists whatever is currently in the textarea, sample or edited, with no special-casing — the existing `saveMutation` (`NotificationSettingsPanel.tsx:41-52`) needs no change beyond reading from the new initial state.

## Non-goals

- No second/alternate sample templates, no template picker UI (spec Assumptions: "no additional selectable templates... required").
- No backend/migration change — `DEFAULT_EVENT_REMINDER_TEMPLATE` never reaches the database except indirectly, as ordinary saved text, if the admin chooses to save it unmodified.
