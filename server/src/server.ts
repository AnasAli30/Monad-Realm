import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { endGameOnBlockchain } from './services/blockchainService';
import { TransactionStatus } from './types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

interface Position {
  x: number;
  y: number;
}

interface Player {
  id: string;
  position: Position;
  snake: Position[];
  direction: string;
  score: number;
  betAmount: number;
  ready: boolean;
  isHost: boolean;
  ethereumAddress?: string;
}

interface Room {
  id: string;
  players: Map<string, Player>;
  food: Position;
  gridSize: number;
  gameStatus: 'waiting' | 'starting' | 'inProgress' | 'finished';
  startTime: number | null;
  endTime: number | null;
  potAmount: number;
  minPlayers: number;
  betAmount: number;
}

const GRID_SIZE = 30;
const GAME_DURATION = 30000; // 1 minute in milliseconds
const MIN_PLAYERS = 2;

function generateFood(gridSize: number): Position {
  return {
    x: Math.floor(Math.random() * gridSize),
    y: Math.floor(Math.random() * gridSize)
  };
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const rooms = new Map<string, Room>();

function createRoom(betAmount: number): Room {
  const roomId = generateRoomId();
  const room: Room = {
    id: roomId,
    players: new Map(),
    food: generateFood(GRID_SIZE),
    gridSize: GRID_SIZE,
    gameStatus: 'waiting',
    startTime: null,
    endTime: null,
    potAmount: 0,
    minPlayers: MIN_PLAYERS,
    betAmount
  };
  rooms.set(roomId, room);
  return room;
}

function checkCollision(pos1: Position, pos2: Position): boolean {
  return pos1.x === pos2.x && pos1.y === pos2.y;
}

function startGame(room: Room) {
  if (room.gameStatus !== 'starting') return;
  
  room.gameStatus = 'inProgress';
  room.startTime = Date.now();
  room.endTime = room.startTime + GAME_DURATION;
  
  // Broadcast game started event with initial state
  io.to(room.id).emit('gameStarted', {
    startTime: room.startTime,
    endTime: room.endTime
  });

  // Broadcast updated game state
  io.to(room.id).emit('gameState', {
    players: Array.from(room.players.values()),
    food: room.food,
    gridSize: room.gridSize,
    gameStatus: room.gameStatus,
    startTime: room.startTime,
    endTime: room.endTime,
    potAmount: room.potAmount
  });

  // Set timeout to end game
  setTimeout(() => endGame(room), GAME_DURATION);
}

async function endGame(room: Room) {
  room.gameStatus = 'finished';
  
  // Find winner(s)
  let highestScore = 0;
  let winners: Player[] = [];
  
  room.players.forEach(player => {
    if (player.score > highestScore) {
      highestScore = player.score;
      winners = [player];
    } else if (player.score === highestScore) {
      winners.push(player);
    }
  });

  // Calculate prize per winner
  const prizePerWinner = room.potAmount / winners.length;

  try {
    // End game on blockchain for each winner
    for (const winner of winners) {
      // Check if winner has an Ethereum address
      if (!winner.ethereumAddress) {
        console.warn(`Winner ${winner.id} has no Ethereum address, skipping blockchain transaction`);
        continue;
      }

      await endGameOnBlockchain(
        room.id,
        winner.ethereumAddress,
        (status) => {
          console.log(`Blockchain transaction status for winner ${winner.id}: ${status}`);
        }
      );
    }

    // Emit game results
    io.to(room.id).emit('gameEnded', {
      winners: winners.map(w => ({
        id: w.id,
        score: w.score,
        prize: prizePerWinner
      }))
    });

    console.log(`Game ${room.id} ended successfully. Winners:`, winners.map(w => w.id));
  } catch (error) {
    console.error('Error ending game on blockchain:', error);
    // Still emit game results even if blockchain transaction fails
    io.to(room.id).emit('gameEnded', {
      winners: winners.map(w => ({
        id: w.id,
        score: w.score,
        prize: prizePerWinner
      })),
      blockchainError: 'Failed to process winnings on blockchain'
    });
  }

  // Clean up room after a delay
  setTimeout(() => {
    rooms.delete(room.id);
  }, 10000);
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('createRoom', ({ betAmount, ethereumAddress }) => {
    const room = createRoom(betAmount);
    socket.join(room.id);
    
    // Initialize host player
    const player: Player = {
      id: socket.id,
      position: {
        x: Math.floor(Math.random() * room.gridSize),
        y: Math.floor(Math.random() * room.gridSize)
      },
      snake: [{
        x: Math.floor(Math.random() * room.gridSize),
        y: Math.floor(Math.random() * room.gridSize)
      }],
      direction: 'right',
      score: 0,
      betAmount: 0,
      ready: false,
      isHost: true,
      ethereumAddress: ethereumAddress
    };

    room.players.set(socket.id, player);

    // Send room info to host
    socket.emit('roomCreated', {
      roomId: room.id,
      betAmount: room.betAmount
    });

    // Send initial game state
    socket.emit('gameState', {
      players: Array.from(room.players.values()),
      food: room.food,
      gridSize: room.gridSize,
      gameStatus: room.gameStatus,
      startTime: room.startTime,
      endTime: room.endTime,
      potAmount: room.potAmount
    });
  });

  socket.on('joinRoom', ({ roomId, ethereumAddress }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.gameStatus !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    socket.join(roomId);

    // Initialize player
    const player: Player = {
      id: socket.id,
      position: {
        x: Math.floor(Math.random() * room.gridSize),
        y: Math.floor(Math.random() * room.gridSize)
      },
      snake: [{
        x: Math.floor(Math.random() * room.gridSize),
        y: Math.floor(Math.random() * room.gridSize)
      }],
      direction: 'right',
      score: 0,
      betAmount: 0,
      ready: false,
      isHost: false,
      ethereumAddress: ethereumAddress
    };

    room.players.set(socket.id, player);

    // Send room info to player
    socket.emit('roomJoined', {
      roomId: room.id,
      betAmount: room.betAmount
    });

    // Broadcast updated game state to all players in room
    io.to(roomId).emit('gameState', {
      players: Array.from(room.players.values()),
      food: room.food,
      gridSize: room.gridSize,
      gameStatus: room.gameStatus,
      startTime: room.startTime,
      endTime: room.endTime,
      potAmount: room.potAmount
    });
  });

  socket.on('placeBet', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      player.betAmount = room.betAmount;
      player.ready = true;
      room.potAmount += room.betAmount;

      // Check if all connected players have placed bets
      let allReady = true;
      let readyCount = 0;
      room.players.forEach(p => {
        if (!p.ready) allReady = false;
        if (p.ready) readyCount++;
      });

      // Start game if minimum players are ready
      if (allReady && readyCount >= room.minPlayers) {
        room.gameStatus = 'starting';
        io.to(roomId).emit('gameStarting');
        
        // Broadcast the starting state
        io.to(roomId).emit('gameState', {
          players: Array.from(room.players.values()),
          food: room.food,
          gridSize: room.gridSize,
          gameStatus: room.gameStatus,
          startTime: null,
          endTime: null,
          potAmount: room.potAmount
        });

        // Start the game after 3 seconds
        setTimeout(() => {
          if (room.gameStatus === 'starting') {
            startGame(room);
          }
        }, 3000);
      }

      // Broadcast updated game state
      io.to(roomId).emit('gameState', {
        players: Array.from(room.players.values()),
        food: room.food,
        gridSize: room.gridSize,
        gameStatus: room.gameStatus,
        startTime: room.startTime,
        endTime: room.endTime,
        potAmount: room.potAmount
      });
    }
  });

  socket.on('move', ({ roomId, direction }) => {
    const room = rooms.get(roomId);
    if (!room || room.gameStatus !== 'inProgress') return;

    const player = room.players.get(socket.id);
    if (player) {
      player.direction = direction;
      
      // Update snake position based on direction
      const head = { ...player.snake[0] };
      switch (direction) {
        case 'up':
          head.y = (head.y - 1 + room.gridSize) % room.gridSize;
          break;
        case 'down':
          head.y = (head.y + 1) % room.gridSize;
          break;
        case 'left':
          head.x = (head.x - 1 + room.gridSize) % room.gridSize;
          break;
        case 'right':
          head.x = (head.x + 1) % room.gridSize;
          break;
      }

      // Check for food collision
      if (checkCollision(head, room.food)) {
        player.score += 1;
        room.food = generateFood(room.gridSize);
      } else {
        player.snake.pop();
      }

      // Check for collision with other snakes
      let collision = false;
      room.players.forEach((otherPlayer) => {
        if (otherPlayer.id !== player.id) {
          otherPlayer.snake.forEach((segment) => {
            if (checkCollision(head, segment)) {
              collision = true;
            }
          });
        }
      });

      if (collision) {
        // Reset player
        player.snake = [{
          x: Math.floor(Math.random() * room.gridSize),
          y: Math.floor(Math.random() * room.gridSize)
        }];
        player.score = Math.max(0, player.score - 2); // Penalty for collision
      } else {
        player.snake.unshift(head);
      }

      // Broadcast updated game state
      io.to(roomId).emit('gameState', {
        players: Array.from(room.players.values()),
        food: room.food,
        gridSize: room.gridSize,
        gameStatus: room.gameStatus,
        startTime: room.startTime,
        endTime: room.endTime,
        potAmount: room.potAmount
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Find and remove player from their room
    for (const [roomId, room] of rooms.entries()) {
      const player = room.players.get(socket.id);
      if (player) {
        room.potAmount -= player.betAmount;
        room.players.delete(socket.id);
        
        // End game if not enough players
        if (room.players.size < room.minPlayers && room.gameStatus === 'inProgress') {
          endGame(room);
        }

        // Clean up room if empty
        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else {
          // Broadcast updated game state
          io.to(roomId).emit('gameState', {
            players: Array.from(room.players.values()),
            food: room.food,
            gridSize: room.gridSize,
            gameStatus: room.gameStatus,
            startTime: room.startTime,
            endTime: room.endTime,
            potAmount: room.potAmount
          });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 