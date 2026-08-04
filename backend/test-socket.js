import { io } from "socket.io-client";
const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});
socket.on("connect", () => {
  console.log("Connected:", socket.id);
  process.exit(0);
});
socket.on("connect_error", (err) => {
  console.error("Connection Error:", err.message);
  process.exit(1);
});
