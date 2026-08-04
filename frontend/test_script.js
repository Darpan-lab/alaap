import { io } from 'socket.io-client';
const socket = io('http://localhost:5000');
socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('call:get_active_rooms', (activeRooms) => {
    console.log('Active rooms:', activeRooms);
    process.exit(0);
  });
});
