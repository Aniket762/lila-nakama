import React, { useState } from "react";
import { useNakama } from "./hooks/useNakama";
import Matchmaking from "./components/Matchmaking/Matchmaking";
import GameContainer from "./components/Game/GameContainer";
import "./App.css";

function App() {
  const { loading, socket, userId } = useNakama();
  const [matchId, setMatchId] = useState<string | null>(null);

  if (loading || !socket || !userId) {
    return (
      <div className="splash">
        <div className="splash-inner">
          <div className="logo-mark">✕ ○</div>
          <h1 className="splash-title">TICTACTOE</h1>
          <div className="connecting-dots">
            <span /><span /><span />
          </div>
          <p className="connecting-text">connecting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-logo">✕ ○</div>
        <h1 className="header-title">TICTACTOE</h1>
        {matchId && (
          <button className="quit-btn" onClick={() => setMatchId(null)}>
            QUIT
          </button>
        )}
      </header>

      <main className="app-main">
        {!matchId ? (
          <Matchmaking socket={socket} onMatchJoined={setMatchId} />
        ) : (
          <GameContainer
            socket={socket}
            matchId={matchId}
            userId={userId}
            onQuit={() => setMatchId(null)}
          />
        )}
      </main>
    </div>
  );
}

export default App;