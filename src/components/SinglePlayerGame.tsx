import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Snake3D from './Snake3D';

const GAME_DURATION = 180000; // 3 minutes in milliseconds
const GRID_SIZE = 30;

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

// Define a type for the view mode
type ViewMode = '2d' | '3d';

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

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  perspective: 1000px;
  overflow: hidden;
  
  
  
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
  
  &.view3d {
    width: 100%;
    height: 100%;
    border-radius: 0;
    background: none;
    border: none;
    box-shadow: none;
    animation: none;
  }
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
  $segmentType?: 'head' | 'body' | 'tail';
  $prevSegment?: Position;
  $nextSegment?: Position;
}

const Cell = styled.div<CellProps>`
  width: 100%;
  height: 100%;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.1s ease;
  overflow: hidden;
  
  ${props => props.$isSnake && css`
    background: ${props.$isHead ? 'var(--color-warning)' : 'var(--color-secondary)'};
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transform: scale(0.85);
    z-index: 2;
    
    ${props.$isHead && css`
      &::before,
      &::after {
        content: '';
        position: absolute;
        width: 25%;
        height: 25%;
        background: #fff;
        border-radius: 50%;
        top: 20%;
        box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);
      }
      
      &::before {
        left: ${props.$direction === 'LEFT' ? '60%' : '15%'};
      }
      
      &::after {
        right: ${props.$direction === 'RIGHT' ? '60%' : '15%'};
      }
      
      ${props.$direction === 'UP' && css`
        transform: rotate(-90deg) scale(0.85);
      `}
      
      ${props.$direction === 'DOWN' && css`
        transform: rotate(90deg) scale(0.85);
      `}
      
      ${props.$direction === 'LEFT' && css`
        transform: rotate(180deg) scale(0.85);
      `}
    `}
    
    ${!props.$isHead && css`
      background: linear-gradient(
        45deg,
        var(--color-secondary) 0%,
        var(--color-primary) 50%,
        var(--color-secondary) 100%
      );
      animation: ${snakePulse} 2s infinite;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          rgba(255, 255, 255, 0.2),
          transparent 50%,
          rgba(0, 0, 0, 0.2)
        );
        border-radius: 8px;
      }
    `}
  `}
  
  ${props => props.$isFood && css`
    &::before {
      content: '';
      position: absolute;
      width: 70%;
      height: 70%;
      top: 15%;
      left: 15%;
      background: radial-gradient(
        circle at 30% 30%,
        #ff8888,
        #ff4444
      );
      border-radius: 50%;
      box-shadow: 
        0 0 15px rgba(255, 68, 68, 0.7),
        inset 0 0 10px rgba(255, 255, 255, 0.5);
      animation: ${foodAppear} 0.5s ease-out, ${pulse} 2s infinite;
    }
    
    &::after {
      content: '';
      position: absolute;
      width: 20%;
      height: 30%;
      top: 5%;
      left: 45%;
      background: #4a7;
      border-radius: 0 50% 0 50%;
      transform: rotate(-45deg);
      box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.3);
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

const ViewToggle = styled.button`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 15px;
  border-radius: 5px;
  color: white;
  font-size: 1rem;
  z-index: 100;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(97, 218, 251, 0.2);
  backdrop-filter: blur(5px);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(97, 218, 251, 0.3);
    transform: translateY(-2px);
  }
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

const GameSelectionModal = styled.div`
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

const GameSelectionContent = styled.div`
  background: rgba(0, 0, 0, 0.9);
  padding: 2rem;
  border-radius: 10px;
  color: white;
  text-align: center;
  border: 2px solid var(--color-secondary);
  box-shadow: 0 0 20px rgba(97, 218, 251, 0.3);
  backdrop-filter: blur(5px);
  width: 80%;
  max-width: 500px;
  
  h2 {
    color: var(--color-secondary);
    margin-bottom: 1.5rem;
    font-size: 2rem;
  }
`;

const GameButton = styled(Button)`
  width: 100%;
  margin-bottom: 1rem;
  padding: 1.5rem;
  font-size: 1.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: rgba(97, 218, 251, 0.2);
  border: 1px solid var(--color-secondary);

  &:hover {
    background: rgba(97, 218, 251, 0.3);
    transform: translateY(-2px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const GameTitle = styled.div`
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--color-secondary);
`;

const GameDescription = styled.div`
  font-size: 1rem;
  opacity: 0.8;
`;

const SinglePlayerGame: React.FC<{ 
  onBackToHome: () => void;
  ethereumAddress?: string;
}> = ({ onBackToHome, ethereumAddress }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showGameSelection, setShowGameSelection] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('');
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
  const [viewMode, setViewMode] = useState<ViewMode>('3d'); // Default to 3D view
  const gameLoopRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const MOVE_COOLDOWN = 150;
  const keysPressedRef = useRef<Set<string>>(new Set());
  const pendingRewardsRef = useRef<Map<string, number>>(new Map());
  const toastIdsRef = useRef<Map<string, string | number>>(new Map());

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('singlePlayerState', (state: GameState) => {
      if (state.gameStatus !== 'waiting') {
        setGameState(state);
      }
    });

    newSocket.on('monCoinRewardPending', (data: { amount: number, rewardId: string }) => {
      pendingRewardsRef.current.set(data.rewardId, data.amount);
      const toastId = toast.loading(
        <div>
          <div>⏳ Processing {data.amount.toFixed(4)} MON</div>
          <div style={{ fontSize: '0.8em', opacity: 0.7 }}>Waiting for transaction confirmation...</div>
        </div>,
        {
          position: "top-right",
          autoClose: false,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        }
      );
      toastIdsRef.current.set(data.rewardId, toastId);
    });

    newSocket.on('monCoinReward', (data: { amount: number, txHash: string, rewardId: string }) => {
      const amount = pendingRewardsRef.current.get(data.rewardId) || data.amount;
      pendingRewardsRef.current.delete(data.rewardId);
      const toastId = toastIdsRef.current.get(data.rewardId);
      
      if (toastId) {
        toast.update(toastId, {
          render: (
            <div 
              onClick={() => window.open(`https://testnet.monadexplorer.com/tx/${data.txHash}`, '_blank')}
              style={{ cursor: 'pointer' }}
            >
              <div>✅ +{amount.toFixed(4)} MON</div>
              <div style={{ fontSize: '0.8em', wordBreak: 'break-all' }}>
                TX: {data.txHash}
              </div>
            </div>
          ),
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
        toastIdsRef.current.delete(data.rewardId);
      }
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

  const startGame = () => {
    if (socket) {
      socket.emit('startSinglePlayer', { ethereumAddress });
    }
    setGameState(prev => ({
      ...prev,
      gameStatus: 'inProgress',
      startTime: Date.now(),
      endTime: null
    }));
    setTimeLeft(GAME_DURATION);
    setShowRules(false);
  };

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
        const currentPos = { x, y };
        const snakeIndex = gameState.snake.findIndex(
          segment => segment.x === x && segment.y === y
        );
        
        const isSnake = snakeIndex !== -1;
        const isFood = gameState.food.x === x && gameState.food.y === y;
        const isHead = snakeIndex === 0;
        
        let prevSegment = undefined;
        let nextSegment = undefined;
        let segmentType: 'head' | 'body' | 'tail' | undefined = undefined;
        
        if (isSnake) {
          if (isHead) {
            segmentType = 'head';
          } else if (snakeIndex === gameState.snake.length - 1) {
            segmentType = 'tail';
          } else {
            segmentType = 'body';
          }
          
          if (snakeIndex > 0) {
            prevSegment = gameState.snake[snakeIndex - 1];
          }
          if (snakeIndex < gameState.snake.length - 1) {
            nextSegment = gameState.snake[snakeIndex + 1];
          }
        }
        
        grid.push(
          <Cell 
            key={`${x}-${y}`} 
            $isSnake={isSnake} 
            $isFood={isFood}
            $isHead={isHead}
            $direction={isHead ? gameState.direction : undefined}
            $segmentType={segmentType}
            $prevSegment={prevSegment}
            $nextSegment={nextSegment}
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

  // Toggle between 2D and 3D views
  const toggleViewMode = () => {
    setViewMode(prevMode => prevMode === '2d' ? '3d' : '2d');
  };

  return (
    <Container>
      <ToastContainer />
      {showGameSelection && (
        <GameSelectionModal>
          <GameSelectionContent>
            <h2>Choose a Game</h2>
            <GameButton onClick={() => {
              setSelectedGame('snake');
              setShowGameSelection(false);
              setShowRules(true);
            }}>
              <GameTitle>Snake Game</GameTitle>
              <GameDescription>Control a snake to collect food and earn MON coins</GameDescription>
            </GameButton>
            <GameButton onClick={() => {
              setSelectedGame('dice');
              setShowGameSelection(false);
              setShowRules(true);
            }}>
              <GameTitle>Dice Game</GameTitle>
              <GameDescription>Roll dice and win MON coins based on your luck</GameDescription>
            </GameButton>
          </GameSelectionContent>
        </GameSelectionModal>
      )}
      
      {showRules && selectedGame === 'snake' && (
        <RulesModal>
          <ModalContent>
            <h2>Snake Game Rules</h2>
            <p>Welcome to Snake Game! Here's how to play:</p>
            <ul>
              <li>Use arrow keys to control the snake</li>
              <li>Collect food to earn MON coins (0.01-0.1 MON per food)</li>
              <li>Avoid hitting the walls or yourself</li>
              <li>Game ends when you hit a wall or time runs out (3 minutes)</li>
              <li>Click on MON rewards to view transactions on Monad Explorer</li>
              <li>Toggle between 2D and 3D views using the view button</li>
            </ul>
            <Button onClick={startGame}>Start Game</Button>
          </ModalContent>
        </RulesModal>
      )}
      
      {showRules && selectedGame === 'dice' && (
        <RulesModal>
          <ModalContent>
            <h2>Dice Game Rules</h2>
            <p>Welcome to Dice Game! Here's how to play:</p>
            <ul>
              <li>Roll two dice and win based on the sum</li>
              <li>Sum of 7: Win 2x your bet</li>
              <li>Sum of 11: Win 3x your bet</li>
              <li>Double numbers: Win 5x your bet</li>
              <li>Any other sum: Lose your bet</li>
            </ul>
            <Button onClick={() => setShowRules(false)}>Start Game</Button>
          </ModalContent>
        </RulesModal>
      )}
      
      {!showGameSelection && !showRules && selectedGame === 'snake' && (
        <>
          <ScorePanel>
            <div>MON: {gameState.monCoinsEarned.toFixed(4)}</div>
            <Timer>Time: {formatTime(timeLeft)}</Timer>
          </ScorePanel>
          
          <ViewToggle onClick={toggleViewMode}>
            {viewMode === '3d' ? 'Switch to 2D View' : 'Switch to 3D View'}
          </ViewToggle>
          
          {viewMode === '2d' ? (
            <GameContainer>
              <Grid size={GRID_SIZE}>
                {renderGrid()}
              </Grid>
            </GameContainer>
          ) : (
            <GameContainer className="view3d">
              <Snake3D 
                snake={gameState.snake}
                food={gameState.food}
                gridSize={GRID_SIZE}
                direction={gameState.direction}
                score={gameState.score}
                gameStatus={gameState.gameStatus}
                isCurrentPlayer={true}
              />
            </GameContainer>
          )}
        </>
      )}
      
      {!showGameSelection && !showRules && selectedGame === 'dice' && (
        <GameContainer>
          <ScorePanel>
            <div>MON: {gameState.monCoinsEarned.toFixed(4)}</div>
          </ScorePanel>
          {/* Dice game UI will be implemented here */}
          <div style={{ color: 'white', textAlign: 'center', marginTop: '2rem' }}>
            Dice Game Coming Soon!
          </div>
        </GameContainer>
      )}

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
