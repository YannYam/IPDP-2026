import { io } from 'socket.io-client';

const URL = import.meta.env.PROD ? undefined : 'http://localhost:3002';
export const socket = io(URL);
