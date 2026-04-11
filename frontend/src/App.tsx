import { useNakama } from "./hooks/useNakama";
import Matchmaking from "./components/Matchmaking/Matchmaking";

function App() {
  const { loading, socket } = useNakama();

  if (loading) return <h2>Connecting...</h2>;

  return (
    <div>
      <h1>Tic Tac Toe</h1>
      <Matchmaking socket={socket} />
    </div>
  );
}

export default App;