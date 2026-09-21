# Student feature boundaries

The Expo Android, iOS, and web clients share these modules. Native credential storage, attachments, and PDF export retain their platform-specific implementations.

| Feature | Responsibility |
| --- | --- |
| `auth` | Session restoration, login completion, profile loading, logout |
| `claim` | Invitation links, code verification, profile review, account creation |
| `onboarding` | Onboarding route decisions and completion helpers |
| `profile` | Profile normalization, editing, avatar/resume hooks, reusable sections |
| `chat` | Conversation state, history, attachments, PDF export, chat components |
| `notifications` | Notification listeners and session-scoped polling |
| `github` | GitHub connection/analysis state and repository presentation |
| `linkedin` | LinkedIn URL/image state and extracted-data presentation |

`App.tsx` composes feature hooks and application chrome. `navigation/AppRoutes.tsx` renders the current route. Existing `screens/ProfileScreen.tsx`, `screens/AriaBotScreen.tsx`, and `screens/ClaimFlowScreens.tsx` are compatibility exports; new implementation belongs in the feature directories. Other onboarding screens remain in `screens`.

Keep API transport and platform storage in `services`. Put request lifecycle and state in feature hooks, pure normalization in helper modules, and presentation in components with explicit props. Avoid adding API calls to reusable profile sections or moving feature behavior back into App.

Notification polling keeps its cursor inside a session effect, prevents overlapping requests, and cleans up listeners/timers. Updating the cursor does not trigger another immediate poll. LinkedIn URL saving clears its loading state on both success and failure.

## Validation

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npx expo export --platform all` before merging. CI requires all four checks.

Feature regressions cover claim registration, profile editing/normalization, chat rendering/send failures, session restoration, notification routing/polling/cleanup, and LinkedIn save state. Exports check Metro resolution and bundled assets for Android, iOS, and web; they do not replace testing an installed app on a device.
