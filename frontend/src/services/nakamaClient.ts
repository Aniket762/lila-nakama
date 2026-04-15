import { Client, Session, Socket } from "@heroiclabs/nakama-js";

const client = new Client("defaultkey", "127.0.0.1", "7350");

let session: Session | null = null;
let socket: Socket | null = null;

export const initNakama = async () => {
    // deviceId as userId for presistance
    // const deviceId = localStorage.getItem("deviceId") || crypto.randomUUID();
    const deviceId = crypto.randomUUID(); // for testing in local need 2 ids from diff browser
    localStorage.setItem("deviceId",deviceId);
    session =await client.authenticateDevice(deviceId);

    // setting username for leaderboard
    const username = "Player_" + deviceId.slice(0, 6);
    await client.updateAccount(session, {
        username
    });

    // socket creation
    socket = client.createSocket();
    await socket.connect(session,true);

    console.log("Connected user:", session.user_id);
    return {client,session,socket};
}

export const getSocket = () => socket;
export const getSession = () => session;