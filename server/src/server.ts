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
  isPrivate: boolean;
  creator: string;
  createdAt: number;
  maxPlayers: number;
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

interface Obstacle {
  position: Position;
  width: number;
  height: number;
  type: 'platform' | 'spike' | 'coin';
}

interface JetpackGameState {
  player: {
    position: Position;
    velocity: Position;
    isJetpackActive: boolean;
  };
  obstacles: Obstacle[];
  gameStatus: 'waiting' | 'inProgress' | 'finished';
  score: number;
  distance: number;
  monCoinsEarned: number;
  startTime: number | null;
  endTime: number | null;
  ethereumAddress?: string;
}
const GRID_SIZE = 30;
const GAME_DURATION = 180000; // 3 minutes in milliseconds
const MIN_PLAYERS = 2;

// Jetpack game settings
const JETPACK_SETTINGS = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  GRAVITY: 0.5,
  THRUST: -0.8,
  MAX_VELOCITY: 10,
  TERMINAL_VELOCITY: 15,
  OBSTACLE_SPEED: 5,
  COIN_VALUE: 1,
  MIN_OBSTACLE_SPACING: 200,
  MAX_OBSTACLE_SPACING: 400
};

// Jetpack game helper functions
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateFood(gridSize: number): Position {
  return {
    x: Math.floor(Math.random() * gridSize),
    y: Math.floor(Math.random() * gridSize)
  };
}

function checkCollision(pos1: Position, pos2: Position): boolean {
  return pos1.x === pos2.x && pos1.y === pos2.y;
}

function createRoom(betAmount: number, roomId: string, isPrivate: boolean, creator: string): Room {
  return {
    id: roomId,
    players: new Map(),
    food: generateFood(GRID_SIZE),
    gridSize: GRID_SIZE,
    gameStatus: 'waiting',
    startTime: null,
    endTime: null,
    potAmount: 0,
    minPlayers: MIN_PLAYERS,
    betAmount: betAmount,
    isPrivate: isPrivate,
    creator: creator,
    createdAt: Date.now(),
    maxPlayers: 2
  };
}

const rooms = new Map<string, Room>();
const singlePlayerGames = new Map<string, SinglePlayerGameState>();
const jetpackGames = new Map<string, JetpackGameState>();
const gameLoops = new Map<string, NodeJS.Timeout>();

function createJetpackGameState(ethereumAddress?: string): JetpackGameState {
  return {
    player: {
      position: { x: 100, y: JETPACK_SETTINGS.CANVAS_HEIGHT / 2 },
      velocity: { x: 0, y: 0 },
      isJetpackActive: false
    },
    obstacles: generateInitialObstacles(),
    gameStatus: 'waiting',
    score: 0,
    distance: 0,
    monCoinsEarned: 0,
    startTime: null,
    endTime: null,
    ethereumAddress
  };
}

function generateInitialObstacles(): Obstacle[] {
  const obstacles: Obstacle[] = []; // Define obstacles array
  let currentX = JETPACK_SETTINGS.CANVAS_WIDTH; // Start obstacles off-screen

  for (let i = 0; i < 5; i++) {
    const type = Math.random() < 0.7 ? 'platform' : Math.random() < 0.5 ? 'spike' : 'coin';
    
    obstacles.push({
      position: {
        x: currentX,
        y: type === 'coin' 
          ? Math.random() * (JETPACK_SETTINGS.CANVAS_HEIGHT - 100) + 50 
          : Math.random() * (JETPACK_SETTINGS.CANVAS_HEIGHT - 150) + 100
      },
      width: type === 'platform' ? 100 + Math.random() * 100 : type === 'spike' ? 30 : 20,
      height: type === 'platform' ? 20 : type === 'spike' ? 30 : 20,
      type
    });

    currentX += JETPACK_SETTINGS.MIN_OBSTACLE_SPACING + 
                Math.random() * (JETPACK_SETTINGS.MAX_OBSTACLE_SPACING - JETPACK_SETTINGS.MIN_OBSTACLE_SPACING);
  }

  return obstacles;
}

// Function to generate random MON coin reward
function generateMonCoinReward(): number {
  return Number((Math.random() * 0.09 + 0.01).toFixed(4)); // Random number between 0.01 and 0.1
}
function updateJetpackGameState(gameState: JetpackGameState, socket: any): void {
  if (gameState.gameStatus !== 'inProgress') return;

  // Update player physics
  const player = gameState.player;

  // Apply jetpack thrust or gravity
  if (player.isJetpackActive) {
    player.velocity.y = Math.max(
      player.velocity.y + JETPACK_SETTINGS.THRUST,
      -JETPACK_SETTINGS.MAX_VELOCITY
    );
  } else {
    player.velocity.y = Math.min(
      player.velocity.y + JETPACK_SETTINGS.GRAVITY,
      JETPACK_SETTINGS.TERMINAL_VELOCITY
    );
  }

  // Store previous Y position for platform collision
  const previousY = player.position.y;
  
  // Update player position
  player.position.y += player.velocity.y;

  // Keep player in bounds
  player.position.y = Math.max(0, Math.min(player.position.y, JETPACK_SETTINGS.CANVAS_HEIGHT - 60));

  // Check for platform collisions
  for (const obstacle of gameState.obstacles) {
    if (obstacle.type === 'platform' && checkJetpackCollision(player.position, obstacle)) {
      // Only land on platform when moving downward
      if (player.velocity.y > 0 && previousY + 60 <= obstacle.position.y) {
        player.position.y = obstacle.position.y - 60; // Place player on top of platform
        player.velocity.y = 0; // Stop vertical movement
        break;
      }
    }
  }
  // Update obstacles and check collisions
  updateObstacles(gameState, socket);

  // Update distance (score)
  gameState.distance += JETPACK_SETTINGS.OBSTACLE_SPEED;
  gameState.score = Math.floor(gameState.distance / 100);
  
  // Add distance-based scoring (every 500 units of distance)
  if (Math.floor(gameState.distance / 500) > Math.floor((gameState.distance - JETPACK_SETTINGS.OBSTACLE_SPEED) / 500)) {
    const monReward = generateMonCoinReward();
    gameState.monCoinsEarned += monReward;
    console.log('Distance milestone - MON coins earned:', monReward, 'Total:', gameState.monCoinsEarned);
    
    // If player has an Ethereum address, reward them for distance milestone
    if (gameState.ethereumAddress) {
      rewardSinglePlayer(gameState.ethereumAddress, monReward, socket)
        .catch((error: unknown) => {
          console.error('Failed to reward jetpack player for distance:', error);
        });
    }
  }
  
  // Check if game duration has elapsed
  if (Date.now() >= gameState.endTime!) {
    gameState.gameStatus = 'finished';
  }

  // Check for game over if player hits the ground too hard
  if (player.position.y >= JETPACK_SETTINGS.CANVAS_HEIGHT - 60 && player.velocity.y > 10) {
    gameState.gameStatus = 'finished';
    gameState.endTime = Date.now();
  }
}

function updateObstacles(gameState: JetpackGameState, socket: any): void {
  const updatedObstacles: Obstacle[] = [];
  let coinCollected = false;

  // Process existing obstacles
  for (const obstacle of gameState.obstacles) {
    // Move obstacle left
    obstacle.position.x -= JETPACK_SETTINGS.OBSTACLE_SPEED;

    // Check for collision with player
    if (checkJetpackCollision(gameState.player.position, obstacle)) {
      if (obstacle.type === 'coin' && !coinCollected) {
        // Collect coin and reward player
        coinCollected = true;
        gameState.score += 10;
        const monReward = generateMonCoinReward();
        gameState.monCoinsEarned += monReward;
        
        // Reward player if they have an Ethereum address
        if (gameState.ethereumAddress) {
          rewardSinglePlayer(gameState.ethereumAddress, monReward, socket)
            .catch((error: unknown) => {
              console.error('Failed to reward player for coin:', error);
            });
        }
        continue; // Remove coin by not adding it to updatedObstacles
      } else if (obstacle.type === 'spike') {
        // Game over on spike collision
        gameState.gameStatus = 'finished';
        gameState.endTime = Date.now();
        return;
      }
      // Platforms don't cause collisions
    }

    // Keep obstacle if still on screen
    if (obstacle.position.x > -100) {
      updatedObstacles.push(obstacle);
    }
  }

  // Generate new obstacles if needed
  while (updatedObstacles.length < 5) {
    const lastObstacle = updatedObstacles[updatedObstacles.length - 1];
    const startX = lastObstacle 
      ? lastObstacle.position.x + JETPACK_SETTINGS.MIN_OBSTACLE_SPACING + 
        Math.random() * (JETPACK_SETTINGS.MAX_OBSTACLE_SPACING - JETPACK_SETTINGS.MIN_OBSTACLE_SPACING)
      : JETPACK_SETTINGS.CANVAS_WIDTH;

    // Randomly select obstacle type
    const type = Math.random() < 0.7 ? 'platform' : Math.random() < 0.5 ? 'spike' : 'coin';
    
    updatedObstacles.push({
      position: {
        x: startX,
        y: type === 'coin' 
          ? Math.random() * (JETPACK_SETTINGS.CANVAS_HEIGHT - 100) + 50
          : Math.random() * (JETPACK_SETTINGS.CANVAS_HEIGHT - 150) + 100
      },
      width: type === 'platform' ? 100 + Math.random() * 100 : type === 'spike' ? 30 : 20,
      height: type === 'platform' ? 20 : type === 'spike' ? 30 : 20,
      type
    });
  }

  gameState.obstacles = updatedObstacles;
}

function checkJetpackCollision(playerPos: Position, obstacle: Obstacle): boolean {
  const playerSize = { width: 40, height: 60 }; // Jetpack player hitbox

  // Calculate collision boundaries
  const playerLeft = playerPos.x;
  const playerRight = playerPos.x + playerSize.width;
  const playerTop = playerPos.y;
  const playerBottom = playerPos.y + playerSize.height;

  const obstacleLeft = obstacle.position.x;
  const obstacleRight = obstacle.position.x + obstacle.width;
  const obstacleTop = obstacle.position.y;
  const obstacleBottom = obstacle.position.y + obstacle.height;

  // Check for overlap
  return !(playerRight < obstacleLeft || 
           playerLeft > obstacleRight || 
           playerBottom < obstacleTop || 
           playerTop > obstacleBottom);
}
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
    }); // Add closing brace for emit
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

// Function to clean up Jetpack game resources
function cleanupJetpackGame(socketId: string): void {
  const gameLoop = gameLoops.get(socketId);
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoops.delete(socketId);
  }
  
  const gameState = jetpackGames.get(socketId);
  if (gameState) {
    gameState.gameStatus = 'finished';
    jetpackGames.delete(socketId);
  }
}
// Add function to get public rooms
function getPublicRooms(): any[] {
  const publicRooms = [];
  for (const [_, room] of rooms) {
    if (!room.isPrivate && room.gameStatus === 'waiting') {
      publicRooms.push({
        id: room.id,
        creator: room.creator,
        betAmount: room.betAmount,
        players: room.players.size,
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt
      });
    }
  }
  return publicRooms;
}

function startGame(room: Room) {
  room.gameStatus = 'inProgress';
  room.startTime = Date.now();
  room.endTime = Date.now() + GAME_DURATION;

  // Start game loop to check for end time
  const gameLoop = setInterval(() => {
    if (room.gameStatus === 'inProgress' && Date.now() >= room.endTime!) {
      endGame(room);
      clearInterval(gameLoop);
    }
  }, 1000);

  io.to(room.id).emit('gameStarted', {
    startTime: room.startTime,
    endTime: room.endTime
  });
}

function endGame(room: Room) {
  room.gameStatus = 'finished';
  room.endTime = Date.now();

  // Find winner(s)
  const winners = Array.from(room.players.values())
    .filter(player => player.score > 0)
    .sort((a, b) => b.score - a.score);

  // If there are winners, distribute rewards to the highest scorer
  if (winners.length > 0 && winners[0].ethereumAddress) {
    const winner = winners[0];
    const winnerAddress = winner.ethereumAddress;
    if (winnerAddress) {
      endGameOnBlockchain(room.id, winnerAddress, (status) => {
        console.log(`Game ${room.id} ended with winner ${winnerAddress}. Status: ${status}`);
      }).catch(error => {
        console.error('Failed to end game on blockchain:', error);
      });
    }
  }

  io.to(room.id).emit('gameEnded', { winners });
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Add handler for getting public rooms
  socket.on('getPublicRooms', () => {
    socket.emit('publicRooms', getPublicRooms());
  });

  socket.on('createRoom', ({ roomId, betAmount, ethereumAddress, isPrivate }) => {
    const room = createRoom(betAmount, roomId, isPrivate, ethereumAddress);
    socket.join(roomId);
    
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

    rooms.set(roomId, room);
    room.players.set(socket.id, player);

    // Send room info to host
    socket.emit('roomCreated', {
      roomId: room.id,
      betAmount: room.betAmount
    });

    // Broadcast updated public rooms list
    if (!isPrivate) {
      io.emit('publicRooms', getPublicRooms());
    }

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

  socket.on('joinRoom', ({ roomId, ethereumAddress, betAmount }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.gameStatus !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    if (room.players.size >= room.maxPlayers) {
      socket.emit('error', { message: 'Room is full' });
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
      betAmount: betAmount || room.betAmount,
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

    // Broadcast updated public rooms list
    if (!room.isPrivate) {
      io.emit('publicRooms', getPublicRooms());
    }

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
      const monCoinReward = Number((Math.random() * 0.03 + 0.01).toFixed(4));
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

  // Jetpack Jerry game handlers
  socket.on('startJetpackGame', ({ ethereumAddress }) => {
    const gameState = createJetpackGameState(ethereumAddress);
    gameState.gameStatus = 'inProgress';
    gameState.startTime = Date.now();
    gameState.endTime = Date.now() + GAME_DURATION;
    
    jetpackGames.set(socket.id, gameState);
    socket.emit('jetpackGameState', gameState);

    // Start game loop
    const gameLoop = setInterval(() => {
      const currentState = jetpackGames.get(socket.id);
      if (currentState && currentState.gameStatus === 'inProgress') {
        updateJetpackGameState(currentState, socket);
        // Only send essential state updates
        const stateUpdate = {
          player: currentState.player,
          obstacles: currentState.obstacles,
          score: currentState.score,
          distance: currentState.distance,
          monCoinsEarned: currentState.monCoinsEarned,
          gameStatus: currentState.gameStatus
        };
        socket.emit('jetpackGameState', stateUpdate);

        if (currentState.gameStatus !== 'inProgress') {
          clearInterval(gameLoop);
          gameLoops.delete(socket.id);
          jetpackGames.delete(socket.id);
        }
      } else {
        clearInterval(gameLoop);
        gameLoops.delete(socket.id);
      }
    }, 1000 / 30); // 30 FPS
    
    // Store the game loop reference for cleanup
    gameLoops.set(socket.id, gameLoop);
    // Ensure game loop is cleared after duration
    setTimeout(() => {
      const gameLoop = gameLoops.get(socket.id);
      if (gameLoop) {
        clearInterval(gameLoop);
        gameLoops.delete(socket.id);
      }
      
      const finalState = jetpackGames.get(socket.id);
      if (finalState) {
        finalState.gameStatus = 'finished';
        socket.emit('jetpackGameState', finalState);
        jetpackGames.delete(socket.id);
      }
    }, GAME_DURATION);
  }); // Add missing closing brace for startJetpackGame handler

  socket.on('jetpackControl', ({ active }) => {
    const gameState = jetpackGames.get(socket.id);
    if (!gameState || gameState.gameStatus !== 'inProgress') return;

    gameState.player.isJetpackActive = active;
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    for (const [roomId, room] of rooms.entries()) {
      const player = room.players.get(socket.id);
      if (player) {
        room.potAmount -= player.betAmount;
        room.players.delete(socket.id);
        
        if (room.players.size < room.minPlayers && room.gameStatus === 'inProgress') {
          endGame(room);
        }

        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else {
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

        // Broadcast updated public rooms list if it was a public room
        if (!room.isPrivate) {
          io.emit('publicRooms', getPublicRooms());
        }
        break;
      }
    }
    
    // Clean up single player games
    singlePlayerGames.delete(socket.id);
    // Clean up Jetpack games
    cleanupJetpackGame(socket.id);
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