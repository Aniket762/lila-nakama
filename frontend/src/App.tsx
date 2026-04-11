import React, { useState } from "react";
import { useNakama } from "./hooks/useNakama";
import Matchmaking from "./components/Matchmaking/Matchmaking";
import GameContainer from "./components/Game/GameContainer";
import { Socket } from "@heroiclabs/nakama-js";

function App() {
  const { loading, socket } = useNakama();
  const [matchId, setMatchId] = useState<string | null>(null);

  if (loading || !socket) return <h2>Connecting...</h2>;

  return (
    <div>
      <h1>Tic Tac Toe</h1>
      {!matchId ? (
        <Matchmaking socket={socket} onMatchJoined={setMatchId} />
      ) : (
        <GameContainer socket={socket} matchId={matchId} />
      )}
    </div>
  );
}

export default App;