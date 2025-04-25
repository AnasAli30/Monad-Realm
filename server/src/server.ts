import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { endGameOnBlockchain, depositToPlayer } from './services/blockchainService';
import { TransactionStatus } from './types';
import { ethers } from 'ethers';
import { verifyFuseKey, decodeFuseKey } from './utils/fuseDecoder';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Add server's private key (should be moved to environment variables in production)
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY || 'your-server-private-key';

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

interface SinglePlayerGameState {
  snake: Position[];
  food: Position;
  direction: string;
  score: number;
  gameStatus: 'waiting' | 'inProgress' | 'finished';
  startTime: number | null;
  endTime: number | null;
  monCoinsEarned: number;
  ethereumAddress?: string;
}

const GRID_SIZE = 30;
const GAME_DURATION = 180000; // 3 minutes in milliseconds
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
const singlePlayerGames = new Map<string, SinglePlayerGameState>();

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

// Function to generate random MON coin reward
function generateMonCoinReward(): number {
  return Number((Math.random() * 0.09 + 0.01).toFixed(4)); // Random number between 0.01 and 0.1
}

// Function to update player balance in smart contract for single player mode
async function rewardSinglePlayer(ethereumAddress: string, amount: number, socket: any): Promise<void> {
  try {
    // Generate a unique reward ID
    const rewardId = Math.random().toString(36).substring(2, 8);

    // Emit pending reward event
    socket.emit('monCoinRewardPending', {
      amount,
      rewardId
    });

    // Call the smart contract to reward the player with isReward=true
    const txHash = await depositToPlayer(
      ethereumAddress,
      amount,
      true, // This is a reward from the game server
      (status: TransactionStatus) => {
        console.log(`Single player reward transaction status: ${status}`);
      }
    );

    console.log('Transaction hash:', txHash);

    // Emit the reward details to the client
    socket.emit('monCoinReward', {
      amount,
      txHash,
      rewardId
    });
  } catch (error: unknown) {
    console.error('Error rewarding single player on blockchain:', error);
    throw error;
  }
}

// Update the single player game state when food is collected
function updateSinglePlayerGameState(gameState: SinglePlayerGameState, socket: any): void {
  if (gameState.gameStatus !== 'inProgress') return;

  const head = gameState.snake[0];
  if (checkCollision(head, gameState.food)) {
    // Generate MON coin reward
    const monCoinsEarned = Number((Math.random() * 0.09 + 0.01).toFixed(4));
    gameState.monCoinsEarned += monCoinsEarned;
    
    // Generate new food position
    gameState.food = generateFood(GRID_SIZE);
    
    // If player has an Ethereum address, reward them
    if (gameState.ethereumAddress) {
      rewardSinglePlayer(gameState.ethereumAddress, monCoinsEarned, socket)
        .catch((error: unknown) => {
          console.error('Failed to reward player:', error);
        });
    }
  }
  
  // Update snake position based on direction
  const newHead = { ...head };
  switch (gameState.direction) {
    case 'UP':
      newHead.y = (newHead.y - 1 + GRID_SIZE) % GRID_SIZE;
      break;
    case 'DOWN':
      newHead.y = (newHead.y + 1) % GRID_SIZE;
      break;
    case 'LEFT':
      newHead.x = (newHead.x - 1 + GRID_SIZE) % GRID_SIZE;
      break;
    case 'RIGHT':
      newHead.x = (newHead.x + 1) % GRID_SIZE;
      break;
  }
  
  // Update snake position
  gameState.snake.unshift(newHead);
  gameState.snake.pop();
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

  socket.on('startSinglePlayer', ({ ethereumAddress }) => {
    const gameState: SinglePlayerGameState = {
      snake: [{
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }],
      food: generateFood(GRID_SIZE),
      direction: 'right',
      score: 0,
      gameStatus: 'inProgress',
      startTime: Date.now(),
      endTime: Date.now() + GAME_DURATION,
      monCoinsEarned: 0,
      ethereumAddress
    };
    
    singlePlayerGames.set(socket.id, gameState);
    socket.emit('singlePlayerState', gameState);
  });

  socket.on('singlePlayerMove', ({ direction }) => {
    const gameState = singlePlayerGames.get(socket.id);
    if (!gameState || gameState.gameStatus !== 'inProgress') return;

    // Update snake position based on direction
    const head = { ...gameState.snake[0] };
    
    // Convert direction to uppercase to match the switch statement
    const upperDirection = direction.toUpperCase();
    
    switch (upperDirection) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }

    // Check for wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      console.log('Wall collision detected! Game over!');
      gameState.gameStatus = 'finished';
      gameState.endTime = Date.now();
      socket.emit('singlePlayerState', gameState);
      return;
    }

    // Check for self collision
    for (let i = 0; i < gameState.snake.length; i++) {
      if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
        console.log('Self collision detected! Game over!');
        gameState.gameStatus = 'finished';
        gameState.endTime = Date.now();
        socket.emit('singlePlayerState', gameState);
        return;
      }
    }

    // Check for food collection
    if (checkCollision(head, gameState.food)) {
      // Generate MON coin reward between 0.01 and 0.1
      const monCoinReward = Number((Math.random() * 0.09 + 0.01).toFixed(4));
      gameState.monCoinsEarned += monCoinReward;
      console.log('MON coins earned:', monCoinReward, 'Total:', gameState.monCoinsEarned);
      
      // Generate new food position
      gameState.food = generateFood(GRID_SIZE);
      
      // Update player balance in smart contract
      if (gameState.ethereumAddress) {
        rewardSinglePlayer(gameState.ethereumAddress, monCoinReward, socket)
          .catch((error: unknown) => {
            console.error('Failed to reward player:', error);
            socket.emit('error', { message: 'Failed to update MON coin balance' });
          });
      }
      
      // Add the new head to the snake without removing the tail
      gameState.snake.unshift(head);
    } else {
      // If no food was eaten, just move the snake
      gameState.snake.unshift(head);
      gameState.snake.pop();
    }

    // Check for game over conditions
    const now = Date.now();
    if (now >= gameState.endTime!) {
      gameState.gameStatus = 'finished';
      gameState.endTime = now;
    }

    // Emit updated game state
    socket.emit('singlePlayerState', gameState);
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
    singlePlayerGames.delete(socket.id);
  });
});

// Add endpoint to generate signature
app.post('/api/generate-signature', async (req, res) => {
  try {
    const { userAddress, encodedFuseKey } = req.body;
    console.log(req.body);
    
    if (!userAddress || !encodedFuseKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify the encoded fuse key
    if (!verifyFuseKey(userAddress, encodedFuseKey)) {
      return res.status(401).json({ error: 'Invalid encoded key' });
    }

    // Create wallet from private key
    const wallet = new ethers.Wallet(SERVER_PRIVATE_KEY);
    
    // Create message hash
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ['address'],
        [userAddress]
      )
    );
    
    // Sign the message
    const signature = await wallet.signMessage(
      ethers.getBytes(messageHash)
    );

    res.json({ signature });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
});

app.post('/api/verify-fuse', async (req, res) => {
  try {
    const { encodedKey, userAddress } = req.body;
    
    if (!encodedKey || !userAddress) {
      return res.status(400).json({ error: 'Missing encoded key or user address' });
    }

    // Decode the key to get the address
    const decodedData = decodeFuseKey(encodedKey, userAddress);
    if (!decodedData) {
      return res.status(401).json({ error: 'Invalid encoded key' });
    }

    const { address } = decodedData;

    // Create wallet from private key
    const wallet = new ethers.Wallet(SERVER_PRIVATE_KEY);
    
    // Create message hash
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ['address'],
        [address]
      )
    );
    
    // Sign the message
    const signature = await wallet.signMessage(
      ethers.getBytes(messageHash)
    );

    res.json({ signature });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 