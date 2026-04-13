import React, { useState } from "react";
import { Socket, MatchmakerMatched } from "@heroiclabs/nakama-js";

interface Props {
  socket: Socket | null;
  onMatchJoined: (matchId: string) => void;
}

const DEMO_BOARD = ["X", "", "O", "", "X", "", "O", "", ""];

const Matchmaking: React.FC<Props> = ({ socket, onMatchJoined }) => {
  const [searching, setSearching] = useState(false);

  const startMatchmaking = async () => {
    if (!socket || searching) return;
    setSearching(true);

    socket.onmatchmakermatched = async (matched: MatchmakerMatched) => {
      try {
        console.log("Match found, joining...");
        const matchId = matched.match_id;
        const token = matched.token;
        const match = matchId
          ? await socket.joinMatch(matchId)
          : await socket.joinMatch(undefined, token);
        console.log("Joined match:", match.match_id);
        onMatchJoined(match.match_id);
      } catch (err) {
        console.error("Join failed:", err);
        setSearching(false);
      }
    };

    try {
      await socket.addMatchmaker("*", 2, 2);
      console.log("Searching...");
    } catch (err) {
      console.error(err);
      setSearching(false);
    }
  };

  const cancelSearch = async () => {
    setSearching(false);
    // Optionally call socket.removeMatchmaker if you store the ticket
  };

  return (
    <div className="matchmaking">
      <div className="matchmaking-hero">
        {/* Decorative mini board */}
        <div className="hero-board">
          {DEMO_BOARD.map((v, i) => (
            <div
              key={i}
              className={`hero-cell ${v === "X" ? "x" : v === "O" ? "o" : "empty"}`}
            >
              {v}
            </div>
          ))}
        </div>

        <h2 className="matchmaking-title">FIND A<br />MATCH</h2>
        <p className="matchmaking-sub">2 players · real time · authoritative</p>
      </div>

      <div className="matchmaking-actions">
        {!searching ? (
          <button className="btn-primary" onClick={startMatchmaking}>
            PLAY NOW
          </button>
        ) : (
          <>
            <button className="btn-primary searching" disabled>
              SEARCHING FOR OPPONENT
            </button>
            <div className="searching-status">
              <div className="status-dot" />
              <span className="status-text">Waiting for another player to join...</span>
              <button className="status-cancel" onClick={cancelSearch}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Matchmaking;