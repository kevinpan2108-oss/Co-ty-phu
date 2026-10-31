# Claude review task — Co Ty Phu Online MVP

Repository: https://github.com/kevinpan2108-oss/Co-ty-phu
Feature branch to review: `feat/online-mvp`

## Your task
Please independently review the current two-player online MVP before it is merged into `main`.

Do not rewrite the project or redesign the interface from scratch. First inspect the current code and report concrete defects. If fixes are needed, create a separate branch named `feat/claude-audit` from `feat/online-mvp`, commit only focused fixes there, and open a pull request back to `feat/online-mvp`. Do not commit directly to `main` or `feat/online-mvp`.

## Review priorities
1. Firebase startup and configuration parsing: test both JSON and the `const firebaseConfig = { ... }` snippet copied from Firebase Console.
2. Room lifecycle: create a room, join with a second anonymous-auth user, reject a third player, and handle a missing/invalid room.
3. Realtime Database rules: verify room creation, joining, member updates, and rejection of writes by a non-member. Check whether the current root-level write rule is too permissive.
4. Multiplayer correctness: only the current player can roll/end a turn; both browsers see the same dice, player positions, money and property ownership; avoid race conditions from nearly simultaneous clicks.
5. Game rules: salary on passing Start, property purchase and rent, stations/utilities, taxes, Chance cards, jail entry/release, turn transition, and bankruptcy.
6. UI: desktop and mobile board layout, text overflow, action buttons, waiting-room state, game-over state, and accessibility.
7. Security: escape player-supplied names, ensure room codes cannot be used to overwrite arbitrary paths, and clearly identify any client-authoritative game-state risks.

## Expected response
- A concise list of findings ranked by severity, with file/line references.
- Tests run and which could not be run without a Firebase project.
- Focused commits on `feat/claude-audit` only if fixes are necessary.
- A pull request targeting `feat/online-mvp` if you made changes.

## Important constraints
- No payment, ads, accounts/passwords, chat, trading, AI opponents, or unrelated features in this MVP.
- Keep it two-player and Vietnamese-first.
- Do not add private keys or service-account JSON to the repository.
