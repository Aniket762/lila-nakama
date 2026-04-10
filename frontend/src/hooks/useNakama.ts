import { useEffect, useState } from "react"
import { initNakama } from "../services/nakamaClient";

export const useNakama = () =>{
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        const init = async () =>{
            await initNakama();
            setLoading(false);
        };
        init();
    },[]);

    return {loading};
}