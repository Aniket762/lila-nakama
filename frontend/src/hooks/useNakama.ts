import { useEffect, useState } from "react";
import { initNakama } from "../services/nakamaClient";
import { Socket } from "@heroiclabs/nakama-js";

export const useNakama = () => {
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { socket, session } = await initNakama();
      setSocket(socket);
      setUserId(session.user_id??null);
      setLoading(false);
    };

    init();
  }, []);

  return { loading, socket, userId };
};