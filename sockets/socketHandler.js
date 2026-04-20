export function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    const { userId } = socket.handshake.query;
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room: ${userId}`);
    }

    socket.on("join", (nextUserId) => {
      if (!nextUserId) return;
      socket.join(nextUserId);
      console.log(`Socket ${socket.id} joined room: ${nextUserId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export function emitVoucherIssued(io, userId, payload) {
  if (!io || !userId) return;
  io.to(userId.toString()).emit("voucher_issued", payload);
}

export function emitVoucherRedeemed(io, payload) {
  if (!io) return;
  io.emit("voucher_redeemed", payload);
}

export function emitShortageAlert(io, payload) {
  if (!io) return;
  io.emit("shortage_alert", payload);
}

export function emitVoucherCancelled(io, userId, payload) {
  if (!io || !userId) return;
  io.to(userId.toString()).emit("voucher_cancelled", payload);
}
