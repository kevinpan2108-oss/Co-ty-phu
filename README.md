# Co Ty Phu Online

A Vietnamese two-player online property-trading board game.

## Current status
- MVP interface and game logic are under development on `feat/online-mvp`.
- Online rooms use Firebase Realtime Database. Each player needs the same Firebase web app configuration.
- The GitHub Pages workflow publishes the game when changes are merged/pushed to `main`.

## Local preview
Open `index.html` with a local web server (for example, VS Code Live Server). Firebase modules are loaded from the browser via CDN.

## Firebase setup (required for online rooms)
1. Create a Firebase project and register a Web app.
2. Enable **Authentication → Anonymous**.
3. Create a **Realtime Database**.
4. Set the Realtime Database rules from `firebase-database.rules.json`.
5. Paste the Firebase web config into the game's setup screen on each device. The config is saved only in that browser's local storage.

The Firebase web config is not a password. Restrict the database with the included rules and do not put service-account keys in the browser.

## Game scope (MVP)
- 2 players, room code, join room.
- 40-space board, dice, turn order.
- Buy properties, pay rent, collect salary, Chance events, Jail and bankruptcy.
- Shared room state synchronized through Firebase Realtime Database.

## Deployment
GitHub Actions deploys the site to GitHub Pages on pushes to `main`. In the repository settings, set **Pages → Build and deployment → Source: GitHub Actions**.
