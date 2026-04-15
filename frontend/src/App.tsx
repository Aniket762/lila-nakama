import React, { useState } from "react";
import { useNakama } from "./hooks/useNakama";
import Matchmaking from "./components/Matchmaking/Matchmaking";
import GameContainer from "./components/Game/GameContainer";
import Leaderboard from "./components/Leaderboard/Leaderboard";
import "./App.css";

type Tab = "play" | "leaderboard";

function App() {
  const { loading, socket, userId } = useNakama();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("play");

  if (loading || !socket || !userId) {
    return (
      <div className="splash">
        <div className="splash-inner">
          <div className="logo-mark">✕ ○</div>
          <h1 className="splash-title">TICTACTOE</h1>
          <div className="connecting-dots"><span /><span /><span /></div>
          <p className="connecting-text">connecting</p>
        </div>
      </div>
    );
  }

  if (matchId) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-logo">✕ ○</div>
          <h1 className="header-title">TICTACTOE</h1>
          <button className="quit-btn" onClick={() => setMatchId(null)}>QUIT</button>
        </header>
        <main className="app-main">
          <GameContainer socket={socket} matchId={matchId} userId={userId} onQuit={() => setMatchId(null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-logo">✕ ○</div>
        <h1 className="header-title">TICTACTOE</h1>
      </header>
      <div className="tab-bar">
        <button className={`tab-btn ${tab === "play" ? "active" : ""}`} onClick={() => setTab("play")}>PLAY</button>
        <button className={`tab-btn ${tab === "leaderboard" ? "active" : ""}`} onClick={() => setTab("leaderboard")}>RANKINGS</button>
      </div>
      <main className="app-main">
        {tab === "play"
          ? <Matchmaking socket={socket} onMatchJoined={setMatchId} />
          : <Leaderboard socket={socket} userId={userId} />}
      </main>
    </div>
  );
}

export default App;