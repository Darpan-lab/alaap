import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: '6a4b5e15c601abfb389df75e' }, 'alaap_super_secret_session_key_987654321_jwt');
const socket = io('http://localhost:5000', { auth: { token } });

socket.on('connect', () => {
  console.log('Test script connected!');
  socket.emit('call:get_active_rooms', (rooms) => {
    console.log('Rooms:', rooms);
    process.exit(0);
  });
});
socket.on('connect_error', (err) => {
  console.error('Connect error:', err);
  process.exit(1);
});
