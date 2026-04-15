# ✕ ○ lila-nakama

> **Real-time multiplayer Tic-Tac-Toe** built on [Nakama](https://heroiclabs.com/nakama/) — server-authoritative game logic, automatic matchmaking, a global leaderboard, and a timed game mode. All game state is validated and managed on the server; the client only renders what the server authorizes.


## Live Features

| Feature | Description |
|---|---|
| **Server-authoritative moves** | All moves validated server-side; clients cannot manipulate game state |
| **Automatic matchmaking** | Two players paired automatically via Nakama's matchmaker |
| **Classic & Timed modes** | Classic has no time limit; Timed gives 30 seconds per move |
| **Turn timer** | Live countdown with automatic forfeit on timeout |
| **Disconnect handling** | Mid-game quit awards win to the remaining player; both clients notified |
| **Global leaderboard** | Persistent rankings with W/L/D stats and win-rate bars |
| **Concurrent sessions** | Nakama handles multiple isolated match rooms simultaneously |
| **Mobile-first UI** | Responsive dark-theme interface optimized for all screen sizes |

---

## Architecture Overview

```
Browser Tab A                    Nakama Server                    Browser Tab B
─────────────────                ─────────────────────────────    ─────────────────
useNakama()                      matchmakerMatched hook
  authenticateDevice() ────────▶ pairs 2 players
  createSocket()                 nk.matchCreate("tictactoe")
                                        │
Matchmaking.tsx                         │ matchInit()
  addMatchmaker("*", 2, 2) ──────────▶ │ initializes GameState
  onmatchmakermatched ◀────────── matchmakerMatched returns matchId
  joinMatch(matchId) ─────────────────▶ matchJoin()
                                        │ adds player to state.players[]
GameContainer mounts                    │
  onmatchdata = listener         matchLoop() runs every 200ms
  sendMatchState(opCode:2) ─────────▶ │ OpCode 2: broadcast state to sender
  ◀─────────────── state (opCode:1) ──┘

Player clicks cell                      │
  sendMatchState(opCode:1) ─────────▶ matchLoop()
                                        │ validates turn + cell
                                        │ updates board
                                        │ checks winner
                                        │ writes leaderboard (if game over)
  ◀─────────────── state (opCode:1) ──┤
                          (opCode:1) ──▶  Tab B receives same state
```

The server is the single source of truth. Clients never update their own game state directly — they send intent (a move), the server validates and applies it, then broadcasts the new state to all participants.

---

## Project Structure

```
lila-nakama/
├── backend/
│   ├── logic.ts              # All server-side game logic
│   ├── build/
│   │   └── logic.js          # Compiled output (mounted into Nakama container)
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   └── src/
│       ├── App.tsx                          # Root component, tab routing
│       ├── App.css                          # Full design system
│       ├── hooks/
│       │   └── useNakama.ts                 # Auth + socket initialization
│       ├── services/
│       │   └── nakamaClient.ts              # Nakama client singleton
│       ├── types/
│       │   └── game.ts                      # GameState, LeaderboardEntry types
│       └── components/
│           ├── Matchmaking/
│           │   └── Matchmaking.tsx          # Mode selector + matchmaker
│           ├── Game/
│           │   └── GameContainer.tsx        # Board, timer, game-over overlay
│           └── Leaderboard/
│               └── Leaderboard.tsx          # Rankings table + personal stats
└── docker-compose.yml
```

---

## Server-Side Logic

All game logic lives in `backend/logic.ts`, compiled to `build/logic.js` and loaded by Nakama's JavaScript runtime (Goja engine).

> **Important:** Nakama's JS runtime is not Node.js. It uses the Goja engine, which has no module system. The compiled output must have no `exports` or `require` calls — set `"module": "none"` in `tsconfig.json` and declare `InitModule` as a top-level `var`.

### Match Lifecycle

Nakama authoritative matches follow a strict lifecycle. Each function runs on the server:

```
matchInit()         Called once when match is created. Initializes GameState.
matchJoinAttempt()  Called for each player trying to join. Returns accept/reject.
matchJoin()         Called after successful join. Adds player to state.players[].
matchLoop()         Called every tick (5×/sec). Processes messages, checks timer.
matchLeave()        Called when a player disconnects. Awards win to remaining player.
matchTerminate()    Called when match ends. Cleanup.
```

#### GameState shape

```typescript
type GameState = {
    board: number[];          // 9 cells: 0=empty, 1=Player1, 2=Player2
    players: string[];        // [userId1, userId2]  — index = playerNumber - 1
    usernames: string[];      // display names, same index as players[]
    turn: number;             // 1 or 2 — whose move it is
    winner: number | null;    // null=in progress, 0=draw, 1=P1 wins, 2=P2 wins
    mode: "classic"|"timed";
    turnDeadline: number|null; // Date.now() + turnDuration*1000
    turnDuration: number;      // seconds per turn (0 in classic)
    disconnected: boolean;     // true if game ended by disconnect
};
```

Player number is derived from array position: `playerNumber = state.players.indexOf(userId) + 1`. This index is used throughout — for board values, winner assignment, and client-side identification.

---

### Move Validation

Every move goes through server-side validation in `matchLoop` before being applied:

```
Client sends OpCode 1 → { index: number }
                                │
              ┌─────────────────▼──────────────────┐
              │ 1. Is game already over?            │ reject if winner !== null
              │ 2. Are both players present?        │ reject if players.length < 2
              │ 3. Is it the sender's turn?         │ reject if pNum !== state.turn
              │ 4. Is the target cell empty?        │ reject if board[index] !== 0
              └─────────────────┬──────────────────┘
                                │ all checks pass
                                ▼
                    Apply move: board[index] = playerNumber
                    Check winner (rows, cols, diagonals)
                    If game over → write leaderboard
                    If not over  → flip turn, reset turnDeadline
                    Broadcast updated state to all players (OpCode 1)
```

Winner check scans all 8 winning lines:

```typescript
const lines = [
    [0,1,2], [3,4,5], [6,7,8],  // rows
    [0,3,6], [1,4,7], [2,5,8],  // columns
    [0,4,8], [2,4,6]             // diagonals
];
// Returns playerNumber if they win, 0 for draw, null if game continues
```

---

### Timer System

When `mode === "timed"`, each turn has a 30-second deadline tracked as an epoch timestamp (`turnDeadline = Date.now() + 30000`). The match loop checks this on every tick:

```
matchLoop tick (every 200ms)
        │
        ├── mode === "timed"?  NO  ──▶ skip
        │
        YES
        │
        ├── winner !== null?   YES ──▶ skip (game already over)
        │
        ├── players.length < 2? YES ──▶ skip (waiting for opponent)
        │
        └── Date.now() > turnDeadline?
                │
               YES
                │
                ├── state.winner = opponent of state.turn
                ├── writeLeaderboard(winner=true, loser=false)
                ├── broadcastMessage(OpCode 3, { timedOut: state.turn })  ← timeout notification
                └── broadcastMessage(OpCode 1, state)                     ← state with winner set
```

The client receives both OpCode 3 (to set the `gameOverReason` to `"timeout"` for the overlay copy) and OpCode 1 (to update the board and trigger the game-over flow).

The frontend tracks `turnDeadline` locally and runs a `setInterval` to show a live countdown. The server's deadline is the authority — the client timer is display-only.

---

### Disconnect Handling

`matchLeave` fires when a WebSocket connection drops or the player navigates away:

```
Player disconnects mid-game
        │
        ├── winner already set? → skip (game was already over)
        │
        ├── players.length === 2? → proceed
        │
        ├── Identify leaver's index → compute winner = other player
        ├── state.winner = winnerNumber
        ├── state.disconnected = true
        ├── writeLeaderboard(winner) + writeLeaderboard(loser)
        ├── broadcastMessage(OpCode 4, { disconnectedPlayer: leaverNumber })
        └── broadcastMessage(OpCode 1, state)
```

The remaining client receives OpCode 4 first (sets `gameOverReason = "disconnect"`) then OpCode 1 (triggers game-over overlay with "Opponent disconnected" copy).

---

### Leaderboard

Nakama's built-in leaderboard feature is used for persistence. The leaderboard is created on module startup:

```typescript
nk.leaderboardCreate(
    "global_rankings",
    false,      
    "desc",     
    "incr",     
    "alltime",  
    undefined
);
```

**Scoring system:** wins = 3 pts, draws = 1 pt, losses = 0 pts (football-style points).

Each record write uses `incr` operator — scores accumulate across all games:

```typescript
nk.leaderboardRecordWrite(
    "global_rankings",
    userId,
    undefined,      // username read from session
    score,          // 3, 1, or 0 — added to existing total
    0,              // subscore unused
    { wins, losses, draws }  // metadata for display
);
```

The `get_leaderboard` RPC fetches the top 20 entries and returns them with rank, username, score, and W/L/D metadata. Called by the frontend via `socket.rpc("get_leaderboard", "")`.

---

### OpCode Reference

| OpCode | Direction | Payload | Meaning |
|---|---|---|---|
| `1` | Server → Client | `GameState` (JSON) | Authoritative game state update |
| `1` | Client → Server | `{ index: number }` | Player move attempt |
| `2` | Client → Server | `{}` | Request current state (sent on mount, polled until received) |
| `3` | Server → Client | `{ timedOut: number }` | Turn timeout notification |
| `4` | Server → Client | `{ disconnectedPlayer: number }` | Opponent disconnect notification |

---

## Matchmaking

Nakama's built-in matchmaker is used with a custom `matchmakerMatched` hook that creates an authoritative match:

```
Player A clicks "Play Classic"
  socket.addMatchmaker("*", 2, 2, { mode: "classic" })
                │
                ▼
        Nakama matchmaker pool
                │
        Player B clicks "Play Classic"
  socket.addMatchmaker("*", 2, 2, { mode: "classic" })
                │
                ▼
        2 players found → matchmakerMatched() fires on server
                │
        nk.matchCreate("tictactoe", { mode: "classic" })
                │
        matchId returned to both clients via onmatchmakermatched
                │
        Both call socket.joinMatch(matchId)
```

The mode property is passed through matchmaker properties (`{ mode }`) and read in the hook to initialize the match with the correct `turnDuration`. Classic and timed players will only be matched with others in the same mode because they pass the same property — Nakama's matchmaker uses property matching in the query.

---

## Frontend

### State Flow

```
useNakama()
  authenticateDevice(deviceId)    ← deviceId from localStorage (stable across reloads)
  socket.connect(session)
  → { socket, userId }
        │
        ▼
App.tsx
  tab: "play" | "leaderboard"
  matchId: string | null
        │
        ├── matchId === null → Matchmaking.tsx
        │       mode: "classic" | "timed"
        │       addMatchmaker() → onmatchmakermatched → joinMatch() → setMatchId()
        │
        └── matchId set → GameContainer.tsx
                onmatchdata listener (set before first OpCode 2 send)
                poll with setInterval(sendMatchState(opCode:2), 300ms) until state received
                state arrives → clearInterval, setState(), render board
                move → sendMatchState(opCode:1, { index })
                OpCode 3/4 → set gameOverReason
                winner !== null → setTimeout(setShowGameOver(true), 500ms)
```

### Key Components

#### `GameContainer.tsx`

The core game view. Responsibilities:

- Attaches `socket.onmatchdata` listener **before** sending the initial OpCode 2 request (avoids the race where state arrives before the listener is ready)
- Polls with OpCode 2 every 300ms until the first state is received, then stops
- Derives `myPlayerNumber` from `state.players.indexOf(userId) + 1` — this is how each client knows which symbol it plays
- Runs a client-side countdown timer keyed to `state.turnDeadline` for display (the server enforces the actual timeout)
- Handles OpCodes 3 and 4 to set `gameOverReason`, which controls game-over overlay copy

#### `Matchmaking.tsx`

- Mode toggle (Classic / Timed) before searching
- Passes `{ mode }` as matchmaker properties so the server can create the right match type
- Manages searching state with shimmer button and cancel option

#### `Leaderboard.tsx`

- Calls `socket.rpc("get_leaderboard", "")` on mount
- Highlights the current user's row and shows their rank card at the top
- Each row shows a gradient win-rate bar (wins / total games × 100%)
- Manual refresh button

---

### Hooks & Services

#### `useNakama.ts`

```typescript
// Returns stable references after initial connection
{ loading: boolean, socket: Socket | null, userId: string | null }
```

Calls `initNakama()` once on mount. Sets `loading = false` after socket connects.

#### `nakamaClient.ts`

```typescript
// Device ID is stable per browser — generates once, persists in localStorage
const deviceId = localStorage.getItem("deviceId") || crypto.randomUUID();
localStorage.setItem("deviceId", deviceId);

// Authenticates as a device user (anonymous, no password needed)
session = await client.authenticateDevice(deviceId);
socket = client.createSocket();
await socket.connect(session, true); // true = appear online
```

Using `crypto.randomUUID()` (not the stored ID) during development lets two browser tabs get different identities for local two-player testing.

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Node.js 18+

### 1. Build the backend

```bash
cd backend
npm install
npx tsc

grep -n "exports\|require" build/logic.js  # should return nothing
```

### 2. Start the server

```bash
docker compose up
```

Watch for these lines confirming everything loaded:

```
"msg":"Tic-Tac-Toe module loaded."
"msg":"Leaderboard ready."
"msg":"Found runtime modules","count":1,"modules":["logic.js"]
"entrypoint":"logic.js"
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm start
```

Open two browser tabs at `http://localhost:3000`. Each tab authenticates with a different device ID (because `crypto.randomUUID()` is called fresh each time). Click **Play** in both tabs to trigger matchmaking.

### 4. Rebuild after backend changes

```bash
cd backend && npx tsc && cd .. && docker compose down && docker compose up
```

---

## Configuration

### `docker-compose.yml` — Key flags

```yaml
--runtime.js_entrypoint logic.js  
--logger.level DEBUG               
--socket.server_key defaultkey    
```

### `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "none",          // Critical: Nakama's Goja runtime has no module system
    "lib": ["ES2020"],
    "outDir": "./build",
    "rootDir": "./",
    "strict": false,
    "types": ["nakama-runtime"],
    "ignoreDeprecations": "6.0"
  },
  "include": ["logic.ts"]      
}
```

`"module": "none"` is the key setting. Without it, TypeScript wraps output in `exports` boilerplate that Goja cannot execute, and the module silently fails to load (`"count":0` in startup logs).

---

## Design Decisions

**Why server-authoritative?**
Relayed matches (Nakama's default) pass messages between clients without any server validation. A client could send any board state. Authoritative matches run all logic on the server — the client only sends intent (which cell to click), and the server decides whether to apply it.

**Why poll with OpCode 2 instead of relying on `matchJoin` broadcast?**
There's a race condition: `matchJoin` fires on the server and may broadcast state before the client's `GameContainer` has mounted and attached `onmatchdata`. The poll-on-mount pattern (send OpCode 2 every 300ms until state arrives) guarantees the client is listening before it requests state.

**Why `"module": "none"` instead of `"commonjs"`?**
Nakama's Goja JavaScript runtime is not Node.js — it doesn't have a module loader. `commonjs` output wraps everything in `exports.default = ...` which Goja ignores, producing `"count":0`. With `"module": "none"`, TypeScript emits a flat script where `var InitModule` is a true global that Goja can find.

**Why `--runtime.js_entrypoint`?**
Without an explicit entrypoint flag, Nakama's JS runtime initializes but doesn't know which file to execute. `"entrypoint":""` in startup logs is the tell — the module files are present but none runs.

**Why leaderboard scores use `incr` operator?**
Nakama's `incr` operator adds the new score to the existing total rather than replacing it. This means every game contributes to a player's running total (3 for a win, 1 for a draw) without needing to read the current score first. Wins, losses, and draws in the metadata are also accumulated by writing them as `{ wins: 1, losses: 0 }` — Nakama merges metadata shallowly.

**Why device authentication?**
Device auth (anonymous) requires no sign-up flow, which is appropriate for a local multiplayer prototype. The device ID is stable per browser via `localStorage`, giving persistent identity across page reloads. For production, swap to email or social auth.   