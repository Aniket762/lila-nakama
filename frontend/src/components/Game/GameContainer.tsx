import React, { useEffect, useState } from "react";
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

  const myPlayerNumber = state ? state.players.indexOf(userId) + 1 : 0;
  const isMyTurn = state ? state.turn === myPlayerNumber : false;
  const mySymbol = myPlayerNumber === 1 ? "X" : myPlayerNumber === 2 ? "O" : "?";
  const oppSymbol = myPlayerNumber === 1 ? "O" : "X";

  useEffect(() => {
    console.log("GameContainer mounted, matchId:", matchId);
    let stateReceived = false;

    socket.onmatchdata = (result) => {
      if (result.match_id !== matchId) return;
      if (result.op_code === 1) {
        const decoded: GameState = JSON.parse(new TextDecoder().decode(result.data));
        console.log("State received:", decoded);
        stateReceived = true;
        setState(decoded);
        if (decoded.winner !== null) {
          setTimeout(() => setShowGameOver(true), 600);
        }
      }
    };

    const interval = setInterval(() => {
      if (stateReceived) { clearInterval(interval); return; }
      console.log("Polling for state...");
      socket.sendMatchState(matchId, 2, JSON.stringify({}));
    }, 300);

    return () => clearInterval(interval);
  }, [socket, matchId]);

  const handleMove = (index: number) => {
    if (!isMyTurn || !state) return;
    if (state.board[index] !== 0) return;
    if (state.winner !== null) return;
    socket.sendMatchState(matchId, 1, JSON.stringify({ index }));
  };

  const getStatusInfo = () => {
    if (!state) return { label: "status", value: "connecting...", cls: "", valueCls: "muted" };
    if (state.winner === 0) return { label: "result", value: "DRAW", cls: "draw", valueCls: "muted" };
    if (state.winner !== null) {
      const iWon = state.winner === myPlayerNumber;
      return {
        label: "result",
        value: iWon ? "YOU WIN" : "YOU LOSE",
        cls: iWon ? "winner-you" : "winner-them",
        valueCls: iWon ? "accent" : "pink"
      };
    }
    if (isMyTurn) return { label: "your turn", value: "MAKE A MOVE", cls: "your-turn", valueCls: "accent" };
    return { label: "waiting", value: "OPPONENT'S TURN", cls: "their-turn", valueCls: "muted" };
  };

  const statusInfo = getStatusInfo();

  const getCellClass = (index: number) => {
    if (!state) return "cell disabled";
    const val = state.board[index];
    const classes = ["cell"];
    if (val === 1) classes.push("filled", "x");
    else if (val === 2) classes.push("filled", "o");
    else if (!isMyTurn || state.winner !== null) classes.push("disabled");
    return classes.join(" ");
  };

  const getCellDisplay = (val: number) => {
    if (val === 1) return "X";
    if (val === 2) return "O";
    return "";
  };

  const shortMatchId = matchId.slice(0, 8).toUpperCase();

  if (!state) {
    return (
      <div className="waiting-state">
        <div className="waiting-spinner" />
        <h2 className="waiting-title">CONNECTING</h2>
        <p className="waiting-sub">Joining match · {shortMatchId}</p>
      </div>
    );
  }

  return (
    <div className="game">
      {/* Status bar */}
      <div className={`status-bar ${statusInfo.cls}`}>
        <div>
          <div className="status-label">{statusInfo.label}</div>
          <div className={`status-value ${statusInfo.valueCls}`}>{statusInfo.value}</div>
        </div>
        {state.winner === null && (
          <div className="turn-indicator">
            <div className={`turn-dot ${state.turn === 1 ? "x" : "o"} active`} />
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.1em" }}>
              {state.turn === myPlayerNumber ? "YOU" : "OPP"}
            </span>
          </div>
        )}
      </div>

      {/* Player cards */}
      <div className="players">
        <div className={`player-card you ${state.turn === myPlayerNumber && state.winner === null ? "active" : ""}`}>
          <div className="player-symbol">{mySymbol}</div>
          <div className="player-label">You</div>
          <div className="player-tag">Player {myPlayerNumber}</div>
        </div>

        <div className="vs-divider">VS</div>

        <div className={`player-card opponent ${state.turn !== myPlayerNumber && state.winner === null ? "active" : ""}`}>
          <div className="player-symbol">{oppSymbol}</div>
          <div className="player-label">Opponent</div>
          <div className="player-tag">Player {myPlayerNumber === 1 ? 2 : 1}</div>
        </div>
      </div>

      {/* Board */}
      <div className="board-wrapper">
        <div className="board">
          {state.board.map((val, i) => (
            <div
              key={i}
              className={getCellClass(i)}
              onClick={() => handleMove(i)}
            >
              {val !== 0 && (
                <span className="cell-content">{getCellDisplay(val)}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Match info footer */}
      <div className="match-info">
        <div>
          <div className="match-id-label">Match ID</div>
          <div className="match-id-value">{shortMatchId}...</div>
        </div>
        <div className="connection-badge">
          <div className="connection-dot" />
          LIVE
        </div>
      </div>

      {/* Game over overlay */}
      {showGameOver && state.winner !== null && (
        <div className="gameover-overlay" onClick={() => setShowGameOver(false)}>
          <div className="gameover-card" onClick={e => e.stopPropagation()}>
            <span className="gameover-emoji">
              {state.winner === 0 ? "🤝" : state.winner === myPlayerNumber ? "🏆" : "💀"}
            </span>
            <div className={`gameover-title ${
              state.winner === 0 ? "draw" : state.winner === myPlayerNumber ? "win" : "lose"
            }`}>
              {state.winner === 0 ? "DRAW" : state.winner === myPlayerNumber ? "YOU WIN" : "YOU LOSE"}
            </div>
            <p className="gameover-sub">
              {state.winner === 0
                ? "Great minds think alike"
                : state.winner === myPlayerNumber
                ? "Flawless victory"
                : "Better luck next time"}
            </p>
            <button className="btn-play-again" onClick={onQuit}>
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameContainer;