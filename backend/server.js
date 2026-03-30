const express = require('express');
const cors = require('cors');
const http = require('https');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/specs', require('./routes/spec'));
app.use('/api/history', require('./routes/history'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/mastermcn', require('./routes/mastermcn'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/digital', require('./routes/digital'));


// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.IO for real-time chat & notifications
const connectedUsers = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('register', ({ nip, role, name }) => {
    if (!nip || !role) {
      console.error('Invalid registration data', { nip, role });
      return;
    }
    connectedUsers[socket.id] = { nip, role, name };
    socket.join(`role_${role}`);
    socket.join(`user_${nip}`);
    io.emit('users_online', Object.values(connectedUsers));
  });

  socket.on('join_spec', (specId) => {
    if (!specId) return;
    socket.join(`spec_${specId}`);
  });

  socket.on('leave_spec', (specId) => {
    if (!specId) return;
    socket.leave(`spec_${specId}`);
  });

  socket.on('spec_message', (data) => {
    if (!data || !data.spec_id) return;
    io.to(`spec_${data.spec_id}`).emit('new_message', data);
    // Notify tagged users – pastikan tagged_users adalah array
    if (data.tagged_users && Array.isArray(data.tagged_users)) {
      data.tagged_users.forEach(nip => {
        io.to(`user_${nip}`).emit('tagged_in_message', data);
      });
    }
  });

  socket.on('spec_uploaded', (data) => {
    if (!data || !data.itemcode) return;
    io.to('role_ppc').emit('new_spec_alert', {
      type: 'new_upload',
      message: `Spec baru diupload: ${data.itemcode} - ${data.speccode || ''}`,
      data
    });
  });

  socket.on('spec_unreleased', (data) => {
    if (!data || !data.itemcode) return;
    io.to('role_tech').emit('unrelease_alert', {
      type: 'unrelease',
      message: `Spec dibatalkan rilis: ${data.itemcode}. Harap hapus dalam 24 jam.`,
      data,
      deadline: new Date(Date.now() + 24 * 3600000).toISOString()
    });
  });

  socket.on('spec_released', (data) => {
    if (!data || !data.itemcode) return;
    io.to('role_tech').emit('release_notification', {
      type: 'released',
      message: `Spec dirilis oleh PPC: ${data.itemcode}`,
      data
    });
  });

  socket.on('coret_saved', (data) => {
    if (!data || !data.itemcode) return;
    io.to('role_ppc').emit('coret_notification', {
      type: 'coret',
      message: `Spec dianotasi: ${data.itemcode} oleh ${data.coretby || ''}`,
      data
    });
  });

  socket.on('disconnect', () => {
    delete connectedUsers[socket.id];
    io.emit('users_online', Object.values(connectedUsers));
  });
});

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 E-Spec Server running on port ${PORT}`);
// });

// module.exports = { app, io };
// If you want to keep the app.listen for local development, you can conditionally run it:
if (process.env.NODE_ENV !== 'production') {
  app.listen(5000, () => {
    console.log('Server running on port 5000');
  });
}

// Export the Express app for Vercel
module.exports = app;
