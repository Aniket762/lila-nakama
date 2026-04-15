import React, { useEffect, useState, useRef } from "react";
import { Socket } from "@heroiclabs/nakama-js";
import { GameState } from "../../types/game";

interface Props {
  socket: Socket;
  matchId: string;
  userId: string;
  onQuit: () => void;
}

const GameContainer: React.FC<Props> = ({ socket, matchId, userId, onQuit }) => {
  const [state, setState] = useState<GameState | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<"normal" | "timeout" | "disconnect">("normal");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myPlayerNumber = state ? state.players.indexOf(userId) + 1 : 0;
  const isMyTurn = state ? state.turn === myPlayerNumber && state.winner === null : false;
  const mySymbol  = myPlayerNumber === 1 ? "X" : "O";
  const oppSymbol = myPlayerNumber === 1 ? "O" : "X";
  const myUsername  = state?.usernames?.[myPlayerNumber - 1] ?? "You";
  const oppUsername = state?.usernames?.[myPlayerNumber === 1 ? 1 : 0] ?? "Opponent";

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!state || state.mode !== "timed" || state.winner !== null || !state.turnDeadline) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((state.turnDeadline! - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    timerRef.current = setInterval(tick, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state?.turnDeadline, state?.winner, state?.mode]);


  useEffect(() => {
    console.log("GameContainer mounted, matchId:", matchId);
    let stateReceived = false;

    socket.onmatchdata = (result) => {
      if (result.match_id !== matchId) return;

      // OpCode 1 — game state update
      if (result.op_code === 1) {
        const decoded: GameState = JSON.parse(new TextDecoder().decode(result.data));
        stateReceived = true;
        setState(decoded);
        if (decoded.winner !== null) {
          setTimeout(() => setShowGameOver(true), 500);
        }
      }

      // OpCode 3 — timeout notification
      if (result.op_code === 3) {
        setGameOverReason("timeout");
      }

      // OpCode 4 — opponent disconnected
      if (result.op_code === 4) {
        setGameOverReason("disconnect");
      }
    };

    const interval = setInterval(() => {
      if (stateReceived) { clearInterval(interval); return; }
      socket.sendMatchState(matchId, 2, JSON.stringify({}));
    }, 300);

    return () => clearInterval(interval);
  }, [socket, matchId]);

  const handleMove = (index: number) => {
    if (!isMyTurn || !state || state.board[index] !== 0 || state.winner !== null) return;
    socket.sendMatchState(matchId, 1, JSON.stringify({ index }));
  };

  const getStatusInfo = () => {
    if (!state) return { label: "status", value: "CONNECTING", cls: "", valueCls: "muted" };
    if (state.winner === 0) return { label: "result", value: "DRAW", cls: "draw", valueCls: "muted" };
    if (state.winner !== null) {
      const iWon = state.winner === myPlayerNumber;
      return { label: "result", value: iWon ? "YOU WIN" : "YOU LOSE", cls: iWon ? "winner-you" : "winner-them", valueCls: iWon ? "accent" : "pink" };
    }
    if (state.players.length < 2) return { label: "status", value: "WAITING FOR OPPONENT", cls: "", valueCls: "muted" };
    if (isMyTurn) return { label: "your turn", value: "MAKE A MOVE", cls: "your-turn", valueCls: "accent" };
    return { label: "waiting", value: "OPPONENT THINKING", cls: "their-turn", valueCls: "muted" };
  };

  const statusInfo = getStatusInfo();
  const shortMatchId = matchId.slice(0, 8).toUpperCase();

  const getGameOverContent = () => {
    if (!state) return null;
    if (state.winner === 0) return { emoji: "🤝", title: "DRAW", sub: "Great minds think alike", cls: "draw" };
    const iWon = state.winner === myPlayerNumber;
    if (gameOverReason === "disconnect") {
      return iWon
        ? { emoji: "🏃", title: "YOU WIN", sub: "Opponent disconnected", cls: "win" }
        : { emoji: "📵", title: "YOU LOSE", sub: "You disconnected", cls: "lose" };
    }
    if (gameOverReason === "timeout") {
      return iWon
        ? { emoji: "⏰", title: "YOU WIN", sub: "Opponent ran out of time", cls: "win" }
        : { emoji: "⏰", title: "TIME'S UP", sub: "You ran out of time", cls: "lose" };
    }
    return iWon
      ? { emoji: "🏆", title: "YOU WIN", sub: "Flawless victory", cls: "win" }
      : { emoji: "💀", title: "YOU LOSE", sub: "Better luck next time", cls: "lose" };
  };

  const gameOverContent = getGameOverContent();

  if (!state) {
    return (
      <div className="waiting-state">
        <div className="waiting-spinner" />
        <h2 className="waiting-title">CONNECTING</h2>
        <p className="waiting-sub">Joining match · {shortMatchId}</p>
      </div>
    );
  }

  const isTimed = state.mode === "timed";
  const timerDanger = timeLeft !== null && timeLeft <= 10;
  const isMyTimerTicking = isTimed && state.turn === myPlayerNumber && state.winner === null;

  return (
    <div className="game">
      <div className={`status-bar ${statusInfo.cls}`}>
        <div>
          <div className="status-label">{statusInfo.label}</div>
          <div className={`status-value ${statusInfo.valueCls}`}>{statusInfo.value}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={`mode-badge ${state.mode}`}>{state.mode.toUpperCase()}</span>
          {state.winner === null && state.players.length === 2 && (
            <div className="turn-indicator">
              <div className={`turn-dot ${state.turn === 1 ? "x" : "o"} active`} />
              <span style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.1em" }}>
                {state.turn === myPlayerNumber ? "YOU" : "OPP"}
              </span>
            </div>
          )}
        </div>
      </div>

      {isTimed && timeLeft !== null && state.winner === null && (
        <div className={`timer-bar ${timerDanger ? "danger" : ""} ${isMyTimerTicking ? "mine" : "theirs"}`}>
          <div className="timer-label">
            {isMyTimerTicking ? "YOUR TIME" : "OPP TIME"}
          </div>
          <div className={`timer-value ${timerDanger ? "danger" : ""}`}>
            {timeLeft}s
          </div>
          <div className="timer-track">
            <div
              className="timer-fill"
              style={{ width: `${(timeLeft / state.turnDuration) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="players">
        <div className={`player-card you ${state.turn === myPlayerNumber && state.winner === null ? "active" : ""}`}>
          <div className="player-symbol">{mySymbol}</div>
          <div className="player-label">{myUsername.slice(0, 10)}</div>
          <div className="player-tag">Player {myPlayerNumber}</div>
        </div>
        <div className="vs-divider">VS</div>
        <div className={`player-card opponent ${state.turn !== myPlayerNumber && state.winner === null ? "active" : ""}`}>
          <div className="player-symbol">{oppSymbol}</div>
          <div className="player-label">{oppUsername.slice(0, 10)}</div>
          <div className="player-tag">Player {myPlayerNumber === 1 ? 2 : 1}</div>
        </div>
      </div>

      <div className="board">
        {state.board.map((val, i) => {
          const cls = ["cell",
            val === 1 ? "filled x" : val === 2 ? "filled o" : (!isMyTurn || state.winner !== null) ? "disabled" : ""
          ].join(" ").trim();
          return (
            <div key={i} className={cls} onClick={() => handleMove(i)}>
              {val !== 0 && <span className="cell-content">{val === 1 ? "X" : "O"}</span>}
            </div>
          );
        })}
      </div>

      <div className="match-info">
        <div>
          <div className="match-id-label">Match</div>
          <div className="match-id-value">{shortMatchId}...</div>
        </div>
        <div className="connection-badge">
          <div className="connection-dot" />
          LIVE
        </div>
      </div>

      {showGameOver && gameOverContent && (
        <div className="gameover-overlay">
          <div className="gameover-card">
            <span className="gameover-emoji">{gameOverContent.emoji}</span>
            <div className={`gameover-title ${gameOverContent.cls}`}>{gameOverContent.title}</div>
            <p className="gameover-sub">{gameOverContent.sub}</p>
            <button className="btn-play-again" onClick={onQuit}>PLAY AGAIN</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameContainer;