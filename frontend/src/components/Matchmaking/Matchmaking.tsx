import React, { useState } from "react";
import { Socket, MatchmakerMatched } from "@heroiclabs/nakama-js";
import { GameMode } from "../../types/game";

interface Props {
  socket: Socket | null;
  onMatchJoined: (matchId: string) => void;
}

const DEMO_BOARD = ["X", "", "O", "", "X", "", "O", "", ""];

const Matchmaking: React.FC<Props> = ({ socket, onMatchJoined }) => {
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<GameMode>("classic");

  const startMatchmaking = async () => {
    if (!socket || searching) return;
    setSearching(true);

    socket.onmatchmakermatched = async (matched: MatchmakerMatched) => {
      try {
        const match = matched.match_id
          ? await socket.joinMatch(matched.match_id)
          : await socket.joinMatch(undefined, matched.token);
        onMatchJoined(match.match_id);
      } catch (err) {
        console.error("Join failed:", err);
        setSearching(false);
      }
    };

    try {
      await socket.addMatchmaker("*", 2, 2, { mode });
      console.log("Searching in", mode, "mode...");
    } catch (err) {
      console.error(err);
      setSearching(false);
    }
  };

  const cancelSearch = () => setSearching(false);

  return (
    <div className="matchmaking">
      <div className="matchmaking-hero">
        <div className="hero-board">
          {DEMO_BOARD.map((v, i) => (
            <div key={i} className={`hero-cell ${v === "X" ? "x" : v === "O" ? "o" : "empty"}`}>{v}</div>
          ))}
        </div>
        <h2 className="matchmaking-title">FIND A<br />MATCH</h2>
        <p className="matchmaking-sub">real-time · server-authoritative</p>
      </div>

      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === "classic" ? "active" : ""}`}
          onClick={() => setMode("classic")}
          disabled={searching}
        >
          <span className="mode-icon">♟</span>
          <span className="mode-label">CLASSIC</span>
          <span className="mode-desc">No time limit</span>
        </button>
        <button
          className={`mode-btn ${mode === "timed" ? "active" : ""}`}
          onClick={() => setMode("timed")}
          disabled={searching}
        >
          <span className="mode-icon">⏱</span>
          <span className="mode-label">TIMED</span>
          <span className="mode-desc">30s per move</span>
        </button>
      </div>

      <div className="matchmaking-actions">
        {!searching ? (
          <button className="btn-primary" onClick={startMatchmaking}>
            PLAY {mode.toUpperCase()}
          </button>
        ) : (
          <>
            <button className="btn-primary searching" disabled>
              SEARCHING · {mode.toUpperCase()}
            </button>
            <div className="searching-status">
              <div className="status-dot" />
              <span className="status-text">Waiting for another player...</span>
              <button className="status-cancel" onClick={cancelSearch}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Matchmaking;