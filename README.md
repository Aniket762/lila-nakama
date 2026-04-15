# ✕ ○ lila-nakama

> **Real-time multiplayer Tic-Tac-Toe** built on [Nakama](https://heroiclabs.com/nakama/) — server-authoritative game logic, automatic matchmaking, a global leaderboard, and a timed game mode. All game state is validated and managed on the server; the client only renders what the server authorizes.


**Real-time multiplayer Tic-Tac-Toe** built with Nakama (server-authoritative).

* ⚡ Live matchmaking
* 🧠 Server-validated game logic
* ⏱️ Timed mode with auto-forfeit
* 🏆 Global leaderboard


## 🚀 Features

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


## 🖼️ UI Flow

<img width="979" height="854" alt="Home Page" src="https://github.com/user-attachments/assets/79632bc2-8e35-4ed1-8979-a9085e45a617" />


<img width="982" height="862" alt="Searching Oponent" src="https://github.com/user-attachments/assets/d3c7d7fa-c636-41bf-afb8-ba83a1eea85d" />


<img width="1913" height="896" alt="two user" src="https://github.com/user-attachments/assets/fd318247-b2b3-4ad0-be64-e1e7a12e6ff9" />

<img width="1912" height="908" alt="timeout win" src="https://github.com/user-attachments/assets/f4e8665a-43f2-46a7-b8f7-820c524ad252" />

<img width="1910" height="900" alt="game screen" src="https://github.com/user-attachments/assets/215fdbf8-543a-4d55-b8b4-b41f7a0c5e5f" />

<img width="1909" height="905" alt="User win state" src="https://github.com/user-attachments/assets/1b67feb9-b79b-4e8a-a384-c182452efe38" />

<img width="1013" height="909" alt="Leaderboard" src="https://github.com/user-attachments/assets/bc04fffd-4231-4baf-8c42-d17750fc0c62" />

<img width="1915" height="908" alt="Nakama Dashboard" src="https://github.com/user-attachments/assets/cf35ce16-f068-42f8-8be6-3fb6099e5c36" />

<img width="1601" height="554" alt="leaderboard" src="https://github.com/user-attachments/assets/dcf733f3-a2b9-4ba7-b3d0-0a1fe9dff2de" />


## 🧠 Architecture Diagram

```
 Browser A                Nakama Server                 Browser B
───────────────        ─────────────────────         ───────────────
 authenticate()  ───▶  matchmakerMatched()   ◀───  authenticate()
                         │
 joinMatch()    ───▶     matchInit()
                         │
 send move      ───▶     validate move
                         │
                         ├── update board
                         ├── check winner
                         ├── update leaderboard
                         │
 receive state  ◀───     broadcast state     ───▶ receive state
```

**Key idea:** Server is the single source of truth. Clients only send intent.


## 📚 Project Structure

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




## 🕹️ Game Flow

1. Player clicks **Play**
2. Matchmaker pairs 2 players
3. Server creates match
4. Players send moves → server validates
5. Server broadcasts updated state
6. Winner → leaderboard updated


## 🏆 Leaderboard Logic

* Win → +3 points
* Draw → +1 point
* Loss → +0 points

Tracks:

* Wins / Losses / Draws
* Rank
* Win rate %


## ▶️ Run Locally

### Backend

```bash
cd backend
npm install
npx tsc
docker compose up
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Watch for these lines confirming everything loaded:

```
"msg":"Tic-Tac-Toe module loaded."
"msg":"Leaderboard ready."
"msg":"Found runtime modules","count":1,"modules":["logic.js"]
"entrypoint":"logic.js"
```

Open:

```
http://localhost:3000
```

Use **two tabs** to test multiplayer.


## 📌 Key Design Decisions

* **Authoritative server** → prevents client cheating
* **Polling on mount** → avoids race conditions
* **Device auth** → no signup needed
* **Incremental leaderboard** → cumulative scoring


## 🔗 Server-Side Logic

All game logic lives in `backend/logic.ts`, compiled to `build/logic.js` and loaded by Nakama's JavaScript runtime (Goja engine).

> **Important:** Nakama's JS runtime is not Node.js. It uses the Goja engine, which has no module system. The compiled output must have no `exports` or `require` calls — set `"module": "none"` in `tsconfig.json` and declare `InitModule` as a top-level `var`.

###  Match Lifecycle

Nakama authoritative matches follow a strict lifecycle. Each function runs on the server:

```
matchInit()         Called once when match is created. Initializes GameState.
matchJoinAttempt()  Called for each player trying to join. Returns accept/reject.
matchJoin()         Called after successful join. Adds player to state.players[].
matchLoop()         Called every tick (5×/sec). Processes messages, checks timer.
matchLeave()        Called when a player disconnects. Awards win to remaining player.
matchTerminate()    Called when match ends. Cleanup.
```


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

### OpCode Reference

| OpCode | Direction | Payload | Meaning |
|---|---|---|---|
| `1` | Server → Client | `GameState` (JSON) | Authoritative game state update |
| `1` | Client → Server | `{ index: number }` | Player move attempt |
| `2` | Client → Server | `{}` | Request current state (sent on mount, polled until received) |
| `3` | Server → Client | `{ timedOut: number }` | Turn timeout notification |
| `4` | Server → Client | `{ disconnectedPlayer: number }` | Opponent disconnect notification |


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
