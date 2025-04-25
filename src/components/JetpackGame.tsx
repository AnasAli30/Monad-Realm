import React, { useEffect, useState, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { toast } from 'react-toastify';

interface Position {
  x: number;
  y: number;
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
}

// Simplified animations
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
`;

const coinSpin = keyframes`
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
`;

const sparkle = keyframes`
  0% { transform: scale(0) rotate(0deg); opacity: 1; }
  100% { transform: scale(1) rotate(180deg); opacity: 0; }
`;

const collisionFlash = keyframes`
  0% { opacity: 0; }
  50% { opacity: 0.5; }
  100% { opacity: 0; }
`;

// Styled components
const GameCanvas = styled.div`
  width: 800px;
  height: 600px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  border: 2px solid var(--color-secondary);
  box-shadow: 0 0 20px rgba(97, 218, 251, 0.2);
`;

const Player = styled.div<{ $position: Position; $isActive: boolean }>`
  width: 40px;
  height: 60px;
  position: absolute;
  left: ${props => props.$position.x}px;
  top: ${props => props.$position.y}px;
  background: var(--color-secondary);
  border-radius: 8px;
  transform-origin: center;
  transform: rotate(${props => props.$isActive ? '-20deg' : '0deg'});
  transition: transform 0.2s ease;
  z-index: 10;

  &::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 10px;
    background: white;
    border-radius: 5px 5px 0 0;
    top: 10px;
    left: 10px;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -${props => props.$isActive ? '30px' : '0px'};
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: ${props => props.$isActive ? '30px' : '0px'};
    background: linear-gradient(180deg, #ff9966, #ff5e62);
    border-radius: 0 0 50% 50%;
    opacity: ${props => props.$isActive ? '1' : '0'};
    transition: all 0.2s ease;
  }
`;

const ObstacleElement = styled.div<{ $position: Position; $width: number; $height: number; $type: string }>`
  position: absolute;
  left: ${props => props.$position.x}px;
  top: ${props => props.$position.y}px;
  width: ${props => props.$width}px;
  height: ${props => props.$height}px;
  background: ${props => 
    props.$type === 'platform' ? 'var(--color-secondary)' :
    props.$type === 'spike' ? 'var(--color-error)' :
    'gold'};
  border-radius: ${props => props.$type === 'coin' ? '50%' : '4px'};
  animation: ${props => props.$type === 'coin' ? coinSpin : 'none'} 2s infinite linear;
`;

const ScorePanel = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 8px;
  color: white;
  font-size: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
`;

const Instructions = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  z-index: 100;
`;

const Timer = styled.div`
  color: var(--color-secondary);
  font-weight: bold;
`;

const CoinParticle = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${props => props.$x}px;
  top: ${props => props.$y}px;
  width: 10px;
  height: 10px;
  background: gold;
  border-radius: 50%;
  animation: ${sparkle} 0.5s ease-out forwards;
  pointer-events: none;
`;

const CollisionEffect = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: red;
  animation: ${collisionFlash} 0.3s ease-out forwards;
  pointer-events: none;
  z-index: 50;
`;

interface JetpackGameProps {
  socket: any;
  ethereumAddress?: string;
  onGameOver: (finalMonEarned: number) => void;
}

const JetpackGame: React.FC<JetpackGameProps> = ({ socket, ethereumAddress, onGameOver }) => {
  const [gameState, setGameState] = useState<JetpackGameState | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const [showInstructions, setShowInstructions] = useState(true);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [showCollision, setShowCollision] = useState(false);
  const gameCanvasRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const socketConnectedRef = useRef<boolean>(false);

  // Initialize socket connection
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      socketConnectedRef.current = true;
      socket.emit('startJetpackGame', { ethereumAddress });
      gameStartTimeRef.current = Date.now();
    };

    socket.on('connect', handleConnect);

    // If socket is already connected, start the game immediately
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, ethereumAddress]);

  // Handle game state updates
  useEffect(() => {
    if (!socket || !socketConnectedRef.current) return;

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
      const delta = timestamp - lastUpdateRef.current;

      // Update at 30 FPS
      if (delta >= 1000 / 30) {
        lastUpdateRef.current = timestamp;
        // Update particles
        setParticles(prev => prev.filter(p => Date.now() - p.id < 500));
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Listen for game state updates
    const handleGameState = (newState: JetpackGameState) => {
      if (gameState && newState.score > gameState.score) {
        const coin = newState.obstacles?.find(o => o.type === 'coin');
        if (coin) {
          setParticles(prev => [
            ...prev,
            { id: Date.now(), x: coin.position.x, y: coin.position.y }
          ]);
        }
      }

      if (gameState?.gameStatus === 'inProgress' && newState.gameStatus === 'finished') {
        setShowCollision(true);
        setTimeout(() => setShowCollision(false), 300);
      }

      setGameState(newState);
      
      if (newState.gameStatus === 'finished') {
        onGameOver(newState.monCoinsEarned);
      }
    };

    socket.on('jetpackGameState', handleGameState);

    // Handle rewards
    socket.on('monCoinRewardPending', (data: { amount: number, rewardId: string }) => {
      toast.loading(`Processing ${data.amount.toFixed(4)} MON reward...`);
    });

    socket.on('monCoinReward', (data: { amount: number, txHash: string }) => {
      toast.success(`Earned ${data.amount.toFixed(4)} MON!`, {
        onClick: () => window.open(`https://testnet.monadexplorer.com/tx/${data.txHash}`, '_blank')
      });
    });

    // Hide instructions after 3 seconds
    const instructionsTimer = setTimeout(() => {
      setShowInstructions(false);
    }, 3000);

    return () => {
      socket.off('jetpackGameState', handleGameState);
      socket.off('monCoinRewardPending');
      socket.off('monCoinReward');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearTimeout(instructionsTimer);
    };
  }, [socket, ethereumAddress, onGameOver, gameState]);

  useEffect(() => {
    if (!gameState?.endTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, gameState.endTime! - now);
      setTimeLeft(Math.floor(remaining / 1000));

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.endTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        socket.emit('jetpackControl', { active: true });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        socket.emit('jetpackControl', { active: false });
      }
    };

    const handleTouchStart = () => {
      socket.emit('jetpackControl', { active: true });
    };

    const handleTouchEnd = () => {
      socket.emit('jetpackControl', { active: false });
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Add touch events to the game canvas
    const canvas = gameCanvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart);
      canvas.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [socket]);

  if (!gameState) return null;

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <GameCanvas ref={gameCanvasRef}>
      {gameState && (
        <>
          <Player 
            $position={gameState.player.position}
            $isActive={gameState.player.isJetpackActive}
          />
          
          {gameState.obstacles?.map((obstacle, index) => (
            <ObstacleElement
              key={index}
              $position={obstacle.position}
              $width={obstacle.width}
              $height={obstacle.height}
              $type={obstacle.type}
            />
          ))}

          <ScorePanel>
            <div>Score: {gameState.score}</div>
            <div>MON: {gameState.monCoinsEarned.toFixed(4)}</div>
            <Timer>Time: {formatTime(timeLeft)}</Timer>
          </ScorePanel>

          {showInstructions && (
            <Instructions>
              Press SPACE or tap screen to activate jetpack.<br />
              Collect coins for MON rewards.<br />
              Avoid spikes!
            </Instructions>
          )}
        </>
      )}
    </GameCanvas>
  );
};

export default JetpackGame;
