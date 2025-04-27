import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import styled from 'styled-components';
import { Toaster, toast } from 'react-hot-toast';
import GameBoard from './components/GameBoard';
import HomeScreen from './components/HomeScreen';
import WalletConnect from './components/WalletConnect';
import GameWallet from './components/GameWallet';
import SinglePlayerGame from './components/SinglePlayerGame';
import MobileWarning from './components/MobileWarning';
import { GlobalStyles } from './styles/GlobalStyles';





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
}

interface GameState {
  players: Player[];
  food: Position;
  gridSize: number;
  gameStatus: 'waiting' | 'starting' | 'inProgress' | 'finished';
  startTime: number | null;
  endTime: number | null;
  potAmount: number;
}

interface Winner {
  id: string;
  score: number;
  prize: number;
}

const ResultModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.9);
  padding: 20px;
  border-radius: 8px;
  color: white;
  text-align: center;
  z-index: 1000;
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    food: { x: 0, y: 0 },
    gridSize: 30,
    gameStatus: 'waiting',
    startTime: null,
    endTime: null,
    potAmount: 0
  });
  const [playerId, setPlayerId] = useState<string>('');
  const [winners, setWinners] = useState<Winner[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [isBlockchainConnected, setIsBlockchainConnected] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [showSinglePlayer, setShowSinglePlayer] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const newSocket = io('https://backend.monadrealm.fun');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (newSocket.id) {
        setPlayerId(newSocket.id);
      }
    });

    newSocket.on('roomCreated', ({ roomId }) => {
      setCurrentRoom(roomId);
      setShowResults(false);
    });

    newSocket.on('roomJoined', ({ roomId }) => {
      setCurrentRoom(roomId);
      setShowHomeScreen(false);
      setShowResults(false);
    });

    newSocket.on('error', ({ message }) => {
      toast.error(message, {
        style: {
          background: '#333',
          color: '#fff',
          border: '1px solid rgba(97, 218, 251, 0.2)',
        },
        iconTheme: {
          primary: '#f44336',
          secondary: '#fff',
        },
      });
    });

    newSocket.on('gameState', (state: GameState) => {
      setGameState(state);
      if (state.gameStatus === 'waiting' || state.gameStatus === 'starting') {
        setShowResults(false);
      }
    });

    newSocket.on('gameStarting', () => {
      setShowResults(false);
      setGameState(prev => ({
        ...prev,
        gameStatus: 'starting'
      }));
    });

    newSocket.on('gameStarted', ({ startTime, endTime }) => {
      setGameState(prev => ({
        ...prev,
        gameStatus: 'inProgress',
        startTime,
        endTime
      }));
    });

    newSocket.on('gameEnded', ({ winners }: { winners: Winner[] }) => {
      setWinners(winners);
      setShowResults(true);
      setGameState(prev => ({
        ...prev,
        gameStatus: 'finished'
      }));
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!socket || !currentRoom || gameState.gameStatus !== 'inProgress') return;

      switch (e.key) {
        case 'ArrowUp':
          socket.emit('move', { roomId: currentRoom, direction: 'up' });
          break;
        case 'ArrowDown':
          socket.emit('move', { roomId: currentRoom, direction: 'down' });
          break;
        case 'ArrowLeft':
          socket.emit('move', { roomId: currentRoom, direction: 'left' });
          break;
        case 'ArrowRight':
          socket.emit('move', { roomId: currentRoom, direction: 'right' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [socket, currentRoom, gameState.gameStatus]);

  const handleJoinRoom = (roomId: string, isHost: boolean, betAmount: number) => {
    if (socket) {
      if (isHost) {
        setCurrentRoom(roomId);
        setShowHomeScreen(false);
      } else {
        socket.emit('joinRoom', { roomId, ethereumAddress: connectedAccount, betAmount });
      }
    }
  };

  const handlePlaceBet = () => {
    if (socket && currentRoom) {
      socket.emit('placeBet', { roomId: currentRoom });
    }
  };

  const handleBackToHome = () => {
    setShowHomeScreen(true);
    setShowResults(false);
    setWinners([]);
    setShowSinglePlayer(false);
  };

  const handleStartSinglePlayer = () => {
    setShowHomeScreen(false);
    setShowSinglePlayer(true);
  };

  const handleWalletConnect = (account: string) => {
    setConnectedAccount(account);
    setIsBlockchainConnected(!!account);
  };

  if (isMobile) {
    return (
      <>
        <GlobalStyles />
        <MobileWarning />
      </>
    );
  }

  return (
    <AppContainer>
      <GlobalStyles />
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(30, 30, 30, 0.9)',
            color: '#fff',
            border: '1px solid rgba(97, 218, 251, 0.2)',
            backdropFilter: 'blur(5px)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), 0 0 10px rgba(97, 218, 251, 0.1)',
          },
        }}
      />
      {showHomeScreen ? (
        <>
          <WalletConnect onConnect={handleWalletConnect} />
          {isBlockchainConnected && connectedAccount && (
            <GameWallet 
              playerAddress={connectedAccount} 
              isBlockchainConnected={isBlockchainConnected} 
            />
          )}
          <HomeScreen 
            socket={socket} 
            onJoinRoom={handleJoinRoom} 
            onPlaceBet={handlePlaceBet}
            onBackToHome={handleBackToHome}
            currentRoom={currentRoom}
            isBlockchainConnected={isBlockchainConnected}
            ethereumAddress={connectedAccount}
            onStartSinglePlayer={handleStartSinglePlayer}
          />
        </>
      ) : showSinglePlayer ? (
        <SinglePlayerGame
          onBackToHome={handleBackToHome}
          ethereumAddress={connectedAccount}
        />
      ) : (
        <GameBoard
          gameState={gameState}
          playerId={playerId}
          onPlaceBet={handlePlaceBet}
          roomId={currentRoom || ''}
          socket={socket}
          isHost={gameState.players.find(p => p.id === playerId)?.isHost || false}
          betAmount={gameState.players.find(p => p.id === playerId)?.betAmount || 0}
          isBlockchainConnected={isBlockchainConnected}
          ethereumAddress={connectedAccount}
        />
      )}
      
      {showResults && (
        <ResultModal>
          <h2>Game Over!</h2>
          {winners.map((winner) => (
            <div key={winner.id}>
              {winner.id === playerId ? (
                <p>You won ${winner.prize}! Score: {winner.score}</p>
              ) : (
                <p>Player {winner.id} won ${winner.prize} with score {winner.score}</p>
              )}
            </div>
          ))}
          <button onClick={handleBackToHome}>Back to Home</button>
        </ResultModal>
      )}
    </AppContainer>
  );
};

export default App; 