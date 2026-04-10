import React from "react";
import { getSocket } from "../../services/nakamaClient";
import { MatchmakerMatched } from "@heroiclabs/nakama-js";

const Matchmaking = () => {
  const startMatchmaking = async () => {
    const socket = getSocket();

    if (!socket) {
      console.error("Socket is not initialized. Make sure initNakama() has run.");
      return;
    }

    try {
      const ticket = await socket.addMatchmaker("*", 2, 2);
      console.log("Searching for match... Ticket:", ticket.ticket);

      socket.onmatchmakermatched = async (matched: MatchmakerMatched) => {
        console.log("Match found! Joining now...", matched);

        try {
          const match = await socket.joinMatch(undefined, matched.token);
          console.log("Successfully joined match:", match.match_id);
          
        } catch (joinError) {
          console.error("Error joining match:", joinError);
        }
      };

    } catch (error) {
      console.error("Failed to add to matchmaking pool:", error);
    }
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>Multiplayer Lobby</h2>
      <button 
        onClick={startMatchmaking}
        style={{ padding: "10px 20px", cursor: "pointer" }}
      >
        Find 1v1 Match
      </button>
    </div>
  );
};

export default Matchmaking;