import { useEffect, useState } from "react";
import { initNakama } from "../services/nakamaClient";
import { Socket } from "@heroiclabs/nakama-js";

export const useNakama = () => {
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const init = async () => {
      const { socket } = await initNakama();
      setSocket(socket);
      setLoading(false);
    };

    init();
  }, []);

  return { loading, socket };
};