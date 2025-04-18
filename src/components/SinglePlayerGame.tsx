import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const GAME_DURATION = 180000; // 3 minutes in milliseconds
const GRID_SIZE = 30;

interface Position {
  x: number;
  y: number;
}

interface GameState {
  snake: Position[];
  food: Position;
  direction: string;
  score: number;
  gameStatus: 'waiting' | 'inProgress' | 'finished';
  startTime: number | null;
  endTime: number | null;
  monCoinsEarned: number;
}

// Define keyframe animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const foodAppear = keyframes`
  0% { transform: scale(0) rotate(180deg); opacity: 0; filter: hue-rotate(0deg) brightness(1.5); }
  20% { transform: scale(1.6) rotate(-60deg); opacity: 0.6; filter: hue-rotate(90deg) brightness(1.9); }
  40% { transform: scale(1.3) rotate(-30deg); opacity: 0.8; filter: hue-rotate(180deg) brightness(1.7); }
  60% { transform: scale(1.1) rotate(-15deg); opacity: 0.9; filter: hue-rotate(270deg) brightness(1.5); }
  80% { transform: scale(0.9) rotate(5deg); opacity: 1; filter: hue-rotate(320deg) brightness(1.3); }
  90% { transform: scale(1.1) rotate(0deg); opacity: 1; filter: hue-rotate(340deg) brightness(1.2); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; filter: hue-rotate(360deg) brightness(1); }
`;

const snakePulse = keyframes`
  0% { filter: brightness(1) saturate(1); }
  50% { filter: brightness(1.3) saturate(1.3); }
  100% { filter: brightness(1) saturate(1); }
`;

const scoreFlash = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.2); color: var(--color-warning); }
  100% { transform: scale(1); }
`;

const gameOverScale = keyframes`
  0% { transform: scale(0.8) rotate(-5deg); opacity: 0; }
  70% { transform: scale(1.1) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const gridShimmer = keyframes`
  0% { box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.4), inset 0 0 5px rgba(97, 218, 251, 0.1); }
  50% { box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(97, 218, 251, 0.3); }
  100% { box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.4), inset 0 0 5px rgba(97, 218, 251, 0.1); }
`;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background: var(--gradient-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(
        rgba(255, 255, 255, 0.05) 1px, 
        transparent 1px
      ),
      linear-gradient(
        90deg, 
        rgba(255, 255, 255, 0.05) 1px, 
        transparent 1px
      );
    background-size: 20px 20px;
    pointer-events: none;
    z-index: 1;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(97, 218, 251, 0.05) 0%, transparent 70%);
    z-index: 0;
    pointer-events: none;
  }
`;

const GameContainer = styled.div`
  position: relative;
  width: min(80vw, 600px);
  height: min(80vw, 600px);
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid rgba(97, 218, 251, 0.3);
  box-shadow: 0 0 20px rgba(97, 218, 251, 0.2), inset 0 0 30px rgba(0, 0, 0, 0.5);
  animation: ${gridShimmer} 3s infinite;
`;

const Grid = styled.div<{ size: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.size}, 1fr);
  grid-template-rows: repeat(${props => props.size}, 1fr);
  width: 100%;
  height: 100%;
  position: relative;
`;

interface CellProps {
  $isSnake: boolean;
  $isFood: boolean;
  $isHead?: boolean;
  $direction?: string;
}

const Cell = styled.div<CellProps>`
  background-color: ${props => 
    props.$isSnake ? 'var(--color-secondary)' : 
    props.$isFood ? '#ff4444' : 'transparent'
  };
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.1s ease;
  position: relative;
  overflow: hidden;
  
  ${props => props.$isSnake && css`
    animation: ${snakePulse} 2s infinite;
    border-radius: 4px;
  `}
  
  ${props => props.$isHead && css`
    &::before {
      content: '';
      position: absolute;
      width: 60%;
      height: 60%;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      top: 20%;
      left: 20%;
    }
    
    &::after {
      content: '';
      position: absolute;
      width: 30%;
      height: 30%;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 50%;
      top: 35%;
      left: 35%;
    }
  `}
  
  ${props => props.$isFood && css`
    animation: ${foodAppear} 0.5s ease-out;
    border-radius: 50%;
    
    &::before {
      content: '';
      position: absolute;
      width: 70%;
      height: 70%;
      background: radial-gradient(circle at 30% 30%, #ff8888, #ff4444);
      border-radius: 50%;
      top: 15%;
      left: 15%;
      box-shadow: 0 0 10px rgba(255, 68, 68, 0.7);
    }
  `}
`;

const ScorePanel = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 5px;
  color: white;
  font-size: 1.2rem;
  display: flex;
  gap: 20px;
  z-index: 10;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(97, 218, 251, 0.2);
  backdrop-filter: blur(5px);
`;

const Timer = styled.div`
  color: var(--color-secondary);
  font-weight: bold;
`;

const GameOverModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
`;

const RulesModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
`;

const ModalContent = styled.div`
  background: rgba(0, 0, 0, 0.9);
  padding: 2rem;
  border-radius: 10px;
  color: white;
  text-align: center;
  border: 2px solid var(--color-secondary);
  box-shadow: 0 0 20px rgba(97, 218, 251, 0.3);
  animation: ${gameOverScale} 0.5s ease-out;
  backdrop-filter: blur(5px);
  width: 80%;
  max-width: 500px;
  
  h2 {
    color: var(--color-secondary);
    margin-bottom: 1rem;
    font-size: 2rem;
  }
  
  p {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    text-align: left;
  }

  ul {
    text-align: left;
    margin-bottom: 1.5rem;
    padding-left: 1.5rem;
  }

  li {
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }
`;

const Button = styled.button`
  background: var(--color-secondary);
  color: black;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
  transition: all 0.3s ease;
  font-weight: bold;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(97, 218, 251, 0.3);
  }
`;

const SinglePlayerGame: React.FC<{ 
  onBackToHome: () => void;
  ethereumAddress?: string;
}> = ({ onBackToHome, ethereumAddress }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showRules, setShowRules] = useState(true);
  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 15, y: 15 }],
    food: { x: 5, y: 5 },
    direction: 'right',
    score: 0,
    gameStatus: 'waiting',
    startTime: null,
    endTime: null,
    monCoinsEarned: 0
  });
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const gameLoopRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const MOVE_COOLDOWN = 150; // 150ms cooldown between moves (faster speed)
  const keysPressedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.emit('startSinglePlayer', { ethereumAddress });

    newSocket.on('singlePlayerState', (state: GameState) => {
      setGameState(state);
    });

    newSocket.on('monCoinReward', (data: { amount: number, txHash: string }) => {
      toast.success(
        <div 
          onClick={() => window.open(`https://testnet.monadexplorer.com/tx/${data.txHash}`, '_blank')}
          style={{ cursor: 'pointer' }}
        >
          <div>🎉 +{data.amount.toFixed(4)} MON</div>
          <div style={{ fontSize: '0.8em', wordBreak: 'break-all' }}>
            TX: {data.txHash}
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        }
      );
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('Game error:', error.message);
      toast.error(error.message);
    });

    return () => {
      newSocket.close();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [ethereumAddress]);

  useEffect(() => {
    if (gameState.gameStatus === 'inProgress') {
      const startTime = Date.now();
      const gameLoop = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const remaining = GAME_DURATION - elapsed;

        if (remaining <= 0) {
          setGameState(prev => ({ ...prev, gameStatus: 'finished' }));
          return;
        }

        setTimeLeft(remaining);
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      };

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.gameStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!socket || gameState.gameStatus !== 'inProgress') return;
      
      // Prevent default behavior for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Add key to pressed keys set
      keysPressedRef.current.add(e.key);
      
      // Check if enough time has passed since the last move
      const currentTime = Date.now();
      if (currentTime - lastMoveTimeRef.current < MOVE_COOLDOWN) {
        return; // Ignore key press if cooldown hasn't elapsed
      }
      
      let newDirection = '';
      
      switch (e.key) {
        case 'ArrowUp':
          if (gameState.direction !== 'DOWN') {
            newDirection = 'UP';
          }
          break;
        case 'ArrowDown':
          if (gameState.direction !== 'UP') {
            newDirection = 'DOWN';
          }
          break;
        case 'ArrowLeft':
          if (gameState.direction !== 'RIGHT') {
            newDirection = 'LEFT';
          }
          break;
        case 'ArrowRight':
          if (gameState.direction !== 'LEFT') {
            newDirection = 'RIGHT';
          }
          break;
      }
      
      if (newDirection) {
        lastMoveTimeRef.current = currentTime;
        socket.emit('singlePlayerMove', { direction: newDirection });
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Remove key from pressed keys set
      keysPressedRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [socket, gameState.gameStatus, gameState.direction]);

  const renderGrid = () => {
    const grid: React.ReactElement[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnake = gameState.snake.some(segment => segment.x === x && segment.y === y);
        const isFood = gameState.food.x === x && gameState.food.y === y;
        const isHead = gameState.snake[0].x === x && gameState.snake[0].y === y;
        
        grid.push(
          <Cell 
            key={`${x}-${y}`} 
            $isSnake={isSnake} 
            $isFood={isFood}
            $isHead={isHead}
            $direction={isHead ? gameState.direction : undefined}
          />
        );
      }
    }
    return grid;
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Container>
      <ToastContainer />
      {showRules && (
        <RulesModal>
          <ModalContent>
            <h2>Game Rules</h2>
            <p>Welcome to Snake Game! Here's how to play:</p>
            <ul>
              <li>Use arrow keys to control the snake</li>
              <li>Collect food to earn MON coins (0.01-0.1 MON per food)</li>
              <li>Avoid hitting the walls or yourself</li>
              <li>Game ends when you hit a wall or time runs out (3 minutes)</li>
              <li>Click on MON rewards to view transactions on Monad Explorer</li>
            </ul>
            <Button onClick={() => setShowRules(false)}>Start Game</Button>
          </ModalContent>
        </RulesModal>
      )}
      <GameContainer>
        <ScorePanel>
          <div>MON: {gameState.monCoinsEarned.toFixed(4)}</div>
          <Timer>Time: {formatTime(timeLeft)}</Timer>
        </ScorePanel>
        <Grid size={GRID_SIZE}>
          {renderGrid()}
        </Grid>
      </GameContainer>

      {gameState.gameStatus === 'finished' && (
        <GameOverModal>
          <ModalContent>
            <h2>Game Over!</h2>
            <p>MON Earned: {gameState.monCoinsEarned.toFixed(4)}</p>
            <Button onClick={onBackToHome}>Back to Home</Button>
          </ModalContent>
        </GameOverModal>
      )}
    </Container>
  );
};

export default SinglePlayerGame;