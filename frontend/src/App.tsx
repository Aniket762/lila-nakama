import Matchmaking from "./components/Matchmaking/Matchmaking";
import { useNakama } from "./hooks/useNakama";

function App(){
  const {loading} = useNakama();

  if(loading) return <h2>Connecting.....</h2>;

  return(
    <div>
      <h1> Tic Tac Toe Nakama</h1>
      <Matchmaking />
    </div>
  );
}