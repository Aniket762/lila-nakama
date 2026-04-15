import React, { useEffect, useState } from "react";
import { Socket } from "@heroiclabs/nakama-js";
import { LeaderboardEntry } from "../../types/game";

interface Props {
  socket: Socket;
  userId: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

const Leaderboard: React.FC<Props> = ({ socket, userId }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await (socket as any).rpc("get_leaderboard", "");
      const data: LeaderboardEntry[] = JSON.parse(result.payload ?? "[]");
      setEntries(data);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError("Failed to load rankings.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const myEntry = entries.find(e => e.userId === userId);
  const myRank  = myEntry?.rank ?? null;

  const winRate = (e: LeaderboardEntry) => {
    const total = e.wins + e.losses + e.draws;
    return total === 0 ? 0 : Math.round((e.wins / total) * 100);
  };

  return (
    <div className="leaderboard">
      <div className="my-rank-card">
        <div className="my-rank-left">
          <div className="my-rank-label">YOUR RANK</div>
          <div className="my-rank-value">
            {myRank ? `#${myRank}` : "UNRANKED"}
          </div>
        </div>
        {myEntry && (
          <div className="my-rank-stats">
            <div className="my-stat">
              <span className="my-stat-val accent">{myEntry.wins}</span>
              <span className="my-stat-label">W</span>
            </div>
            <div className="my-stat-divider" />
            <div className="my-stat">
              <span className="my-stat-val pink">{myEntry.losses}</span>
              <span className="my-stat-label">L</span>
            </div>
            <div className="my-stat-divider" />
            <div className="my-stat">
              <span className="my-stat-val muted">{myEntry.draws}</span>
              <span className="my-stat-label">D</span>
            </div>
            <div className="my-stat-divider" />
            <div className="my-stat">
              <span className="my-stat-val">{winRate(myEntry)}%</span>
              <span className="my-stat-label">WR</span>
            </div>
          </div>
        )}
      </div>


      <div className="lb-header">
        <span className="lb-title">GLOBAL RANKINGS</span>
        <button className="lb-refresh" onClick={fetchLeaderboard} disabled={loading}>
          {loading ? "···" : "↻ REFRESH"}
        </button>
      </div>

      {lastRefresh && (
        <p className="lb-updated">
          Updated {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {loading ? (
        <div className="lb-loading">
          <div className="waiting-spinner" style={{ width: 36, height: 36 }} />
          <p className="waiting-sub" style={{ marginTop: 12 }}>Loading rankings...</p>
        </div>
      ) : error ? (
        <div className="lb-error">
          <p>{error}</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={fetchLeaderboard}>
            RETRY
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="lb-empty">
          <span className="lb-empty-icon">🏆</span>
          <p className="lb-empty-text">No rankings yet.</p>
          <p className="lb-empty-sub">Play a game to appear here!</p>
        </div>
      ) : (
        <div className="lb-list">
          {entries.map((entry, idx) => {
            const isMe = entry.userId === userId;
            const wr   = winRate(entry);
            return (
              <div key={entry.userId} className={`lb-row ${isMe ? "me" : ""}`}
                   style={{ animationDelay: `${idx * 40}ms` }}>
                <div className="lb-rank">
                  {idx < 3 ? MEDALS[idx] : <span className="lb-rank-num">#{entry.rank}</span>}
                </div>
                <div className="lb-player">
                  <div className="lb-username">
                    {entry.username}
                    {isMe && <span className="lb-you-tag">YOU</span>}
                  </div>
                  <div className="lb-record">
                    <span className="lb-w">{entry.wins}W</span>
                    <span className="lb-sep">·</span>
                    <span className="lb-l">{entry.losses}L</span>
                    <span className="lb-sep">·</span>
                    <span className="lb-d">{entry.draws}D</span>
                  </div>
                </div>
                <div className="lb-right">
                  <div className="lb-score">{entry.score}</div>
                  <div className="lb-wr">{wr}% WR</div>
                </div>
                {/* Win rate bar */}
                <div className="lb-wr-bar">
                  <div className="lb-wr-fill" style={{ width: `${wr}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="lb-scoring-note">
        Score: 3pts per win · 1pt per draw · 0pts per loss
      </p>
    </div>
  );
};

export default Leaderboard;