import React, { useEffect } from "react";
import { Socket, MatchmakerMatched } from "@heroiclabs/nakama-js";

interface Props {
  socket: Socket | null;
  onMatchJoined: (matchId:string) => void;
}

const Matchmaking: React.FC<Props> = ({ socket, onMatchJoined }) => {
  useEffect(() => {
    if (!socket) return;

    socket.onmatchmakermatched = async (matched: MatchmakerMatched) => {
      console.log("match found", matched);

      try {
        const match = await socket.joinMatch(undefined, matched.token);
        console.log("joined match", match.match_id);
        onMatchJoined(match.match_id);
      } catch (err) {
        console.error("join failed:", err);
      }
    };
  }, [socket, onMatchJoined]);

  const startMatchmaking = async () => {
    if (!socket) {
      console.error("Socket not initialized");
      return;
    }

    try {
      const ticket = await socket.addMatchmaker("*", 2, 2);
      console.log("Searching for oppenent...", ticket.ticket);
    } catch (err) {
      console.error("matchmaking failed:", err);
    }
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>Multiplayer Lobby</h2>

      <button onClick={startMatchmaking}>
        Find 1v1 Match
      </button>
    </div>
  );
};

export default Matchmaking;