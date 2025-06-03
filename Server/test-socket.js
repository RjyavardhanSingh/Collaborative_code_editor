import { io } from 'socket.io-client';

// Replace with your actual JWT token from login API
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODNlZDBkNzUzNWIyY2U2NzFkNDRjZjkiLCJpYXQiOjE3NDg5NDg4MTQsImV4cCI6MTc1MTU0MDgxNH0.aEm8v-cM-g33JXf0Ek6LY8kjbcjkCc4GP9mPWfziaWM';

// Replace with an actual document ID from your database
const documentId = '683edd379438bf2f89ae18ef';

const socket = io('http://localhost:5000', {
  auth: { token },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  // Join a document
  socket.emit('join-document', { documentId });
  console.log(`📄 Joining document: ${documentId}`);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('user-joined', (data) => {
  console.log('👤 User joined:', data);
});

socket.on('document-change', (data) => {
  console.log('📝 Document change received:', data);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Test document changes after 2 seconds
setTimeout(() => {
  console.log('📤 Sending test document change');
  socket.emit('document-change', { 
    documentId,
    changes: { text: 'Test change from Node.js client', position: 10 }
  });
}, 2000);

// Keep connection open
process.on('SIGINT', () => {
  console.log('Disconnecting...');
  socket.disconnect();
  process.exit();
});