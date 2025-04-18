import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { createRoomOnBlockchain, joinRoomOnBlockchain, TransactionStatus, getConnectedAccount } from '../services/blockchainService';
import GameWallet from './GameWallet';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const slideDown = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background: var(--gradient-dark);
  background: linear-gradient(to bottom, 
    rgba(20, 30, 40, 0.95), 
    rgba(10, 15, 25, 0.98)
  ), var(--gradient-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  animation: ${fadeIn} 0.6s ease-out;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 50%, rgba(97, 218, 251, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
    z-index: 1;
    pointer-events: none;
  }
  
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
      linear-gradient(
        rgba(255, 255, 255, 0.03) 1px, 
        transparent 1px
      ),
      linear-gradient(
        90deg, 
        rgba(255, 255, 255, 0.03) 1px, 
        transparent 1px
      );
    background-size: 20px 20px;
    pointer-events: none;
    z-index: 0;
  }
  
  @media (max-width: 768px) {
    padding: 0;
  }
  
  @media (max-height: 600px) {
    justify-content: flex-start;
    padding-top: 2vh;
  }
`;

const NavBar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(to right, rgba(20, 30, 40, 0.95), rgba(10, 15, 25, 0.98));
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 1000;
  border-bottom: 1px solid rgba(97, 218, 251, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
`;

const Logo = styled.div`
  font-size: 1.5rem;
  color: #61dafb;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  &::before {
    content: "🐍";
    font-size: 1.8rem;
  }
`;

const WalletContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 20px;
`;

const WalletLogo = styled.div`
  font-size: 1.5rem;
  color: #61dafb;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  padding: 8px 15px;
  border-radius: 8px;
  background: rgba(97, 218, 251, 0.1);
  
  &:hover {
    transform: scale(1.05);
    background: rgba(97, 218, 251, 0.2);
  }
  
  &::before {
    content: "💰";
    font-size: 1.8rem;
  }
`;

const WalletWrapper = styled.div<{ isVisible: boolean }>`
  position: absolute;
  top: 100%;
  right: -100px;
  margin-top: 10px;
  transform-origin: top right;
  z-index: 1000;
  opacity: ${props => props.isVisible ? 1 : 0};
  transform: ${props => props.isVisible ? 'translateY(0)' : 'translateY(-100%)'};
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
  pointer-events: ${props => props.isVisible ? 'auto' : 'none'};
  width: 300px;
`;

const Title = styled.h1`
  color: var(--color-secondary);
  margin-bottom: clamp(20px, 5vh, 40px);
  font-size: clamp(2.5rem, 8vmin, 4rem);
  text-align: center;
  text-shadow: 0 0 15px rgba(97, 218, 251, 0.5);
  font-weight: bold;
  letter-spacing: 2px;
  position: relative;
  z-index: 2;
  animation: ${slideIn} 0.8s ease-out;
  
  @media (max-width: 768px) {
    margin-bottom: clamp(15px, 4vh, 30px);
  }
  
  @media (max-height: 600px) {
    margin-bottom: 15px;
    font-size: clamp(2rem, 6vmin, 3rem);
  }
`;

const Card = styled.div`
  background: var(--gradient-dark);
  padding: clamp(20px, 4vmin, 35px);
  border-radius: var(--border-radius-lg);
  width: min(450px, 85vw);
  max-height: 90vh;
  text-align: center;
  box-shadow: var(--shadow-lg), 0 0 20px rgba(97, 218, 251, 0.15);
  position: relative;
  z-index: 2;
  animation: ${slideIn} 0.5s ease-out;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow-y: auto;
  
  p {
    color: var(--color-text);
    margin-bottom: clamp(10px, 2vh, 15px);
    font-size: clamp(0.9rem, 2.5vmin, 1.1rem);
  }
  
  @media (max-width: 768px) {
    padding: clamp(15px, 3vmin, 25px);
  }
  
  @media (max-height: 600px) {
    padding: 15px;
  }
`;

const Button = styled.button`
  background: var(--gradient-secondary);
  color: black;
  border: none;
  padding: clamp(12px, 2vmin, 16px) clamp(20px, 4vmin, 30px);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-size: clamp(1rem, 2.5vmin, 1.2rem);
  margin: clamp(8px, 1.5vh, 12px);
  width: min(220px, 80%);
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0)
    );
    transition: left 0.7s ease;
  }
  
  &:hover {
    background: var(--color-secondary-hover);
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
  }
  
  &:hover:before {
    left: 100%;
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: var(--shadow-sm);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background: #7a7a7a;
    transform: none;
    box-shadow: none;
  }
  
  @media (max-width: 768px) {
    width: min(100%, 300px);
    padding: clamp(10px, 2vmin, 14px) clamp(15px, 3vmin, 25px);
    font-size: clamp(0.9rem, 2.2vmin, 1.1rem);
    margin: clamp(6px, 1vh, 10px);
  }
  
  @media (max-height: 600px) {
    padding: 10px 18px;
    font-size: 0.9rem;
    margin: 5px;
  }
`;

const Input = styled.input`
  padding: clamp(12px, 2vmin, 16px);
  border-radius: var(--border-radius-md);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: clamp(8px, 1.5vh, 12px) 0;
  width: 100%;
  font-size: clamp(0.9rem, 2.2vmin, 1.1rem);
  background-color: rgba(0, 0, 0, 0.3);
  color: var(--color-text);
  transition: all 0.3s ease;
  box-sizing: border-box;
  outline: none;
  height: clamp(45px, 8vh, 60px);
  
  &:focus {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 2px rgba(97, 218, 251, 0.3);
  }
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: 110%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: var(--border-radius-sm);
  font-size: 0.85rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
  box-shadow: var(--shadow-md);
  width: max-content;
  max-width: 220px;
  
  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
  }
`;

const InputContainer = styled.div`
  position: relative;
  width: 100%;
  margin-bottom: 15px;
  
  &:hover ${Tooltip} {
    opacity: 1;
  }
`;

const Label = styled.label`
  color: var(--color-text);
  display: block;
  margin-bottom: clamp(5px, 1vh, 10px);
  text-align: left;
  font-weight: 500;
  font-size: clamp(0.9rem, 2.2vmin, 1.05rem);
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: clamp(15px, 3vh, 25px);
  width: 100%;
  gap: clamp(8px, 1.5vh, 12px);
  
  @media (min-width: 480px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const RoomInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
`;

const SuccessIcon = styled.div`
  font-size: 3rem;
  color: #4CAF50;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #4CAF50;
`;

const RoomId = styled.div`
  font-size: clamp(1.4rem, 4vmin, 1.7rem);
  font-weight: bold;
  color: var(--color-secondary);
  margin: clamp(10px, 2vh, 15px) 0;
  padding: clamp(12px, 2.5vmin, 18px);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(30, 30, 30, 0.5) 100%);
  border-radius: var(--border-radius-md);
  display: inline-block;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 10px rgba(97, 218, 251, 0.2);
  border: 1px solid rgba(97, 218, 251, 0.3);
  text-shadow: 0 0 10px rgba(97, 218, 251, 0.7);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(97, 218, 251, 0.3);
    border-color: rgba(97, 218, 251, 0.5);
  }
`;

const ShareText = styled.div`
  color: #666;
  margin-top: 0.5rem;
`;

const CopyButton = styled.button`
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-hover) 100%);
  color: white;
  border: none;
  padding: clamp(10px, 2vmin, 15px) clamp(20px, 4vmin, 30px);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  margin-top: clamp(10px, 2vh, 15px);
  font-weight: 600;
  font-size: clamp(0.9rem, 2.2vmin, 1.1rem);
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0)
    );
    transition: left 0.7s ease;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
  
  &:hover:before {
    left: 100%;
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }
`;

const TransactionStatusIndicator = styled.div<{ status: TransactionStatus }>`
  margin-top: clamp(10px, 2vh, 15px);
  padding: clamp(8px, 1.5vmin, 12px);
  border-radius: var(--border-radius-sm);
  text-align: center;
  font-weight: bold;
  background-color: ${props => {
    switch (props.status) {
      case 'pending':
        return '#ffd700';
      case 'confirmed':
        return '#4caf50';
      case 'failed':
        return '#f44336';
      default:
        return 'transparent';
    }
  }};
  color: ${props => props.status === 'pending' ? 'black' : 'white'};
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  backdrop-filter: blur(5px);
  animation: ${fadeIn} 0.3s ease-out;
`;

const LoadingContent = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  text-align: center;
  color: white;
  max-width: 400px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  h3 {
    margin-bottom: 20px;
    color: var(--color-warning);
    font-size: 24px;
  }
  
  p {
    margin: 15px 0;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
  }
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-left-color: var(--color-warning);
  border-radius: 50%;
  margin: 20px auto;
  animation: ${spin} 1s linear infinite;
`;

interface HomeScreenProps {
  socket: any;
  onJoinRoom: (roomId: string, isHost: boolean, betAmount: number) => void;
  currentRoom: string | null;
  isBlockchainConnected: boolean;
  connectedAccount: string;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  socket, 
  onJoinRoom, 
  currentRoom,
  isBlockchainConnected,
  connectedAccount 
}) => {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [betAmount, setBetAmount] = useState('1');
  const [createdRoomId, setCreatedRoomId] = useState<string>('');
  const [confirmedRoomId, setConfirmedRoomId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>('idle');
  const [showRoomCreated, setShowRoomCreated] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('roomCreated', (data: { roomId: string }) => {
        console.log('Room created in HomeScreen:', data.roomId);
        setCreatedRoomId(data.roomId);
      });

      return () => {
        socket.off('roomCreated');
      };
    }
  }, [socket]);

  const handleCreateRoom = async () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }

    if (!betAmount || isNaN(parseFloat(betAmount)) || parseFloat(betAmount) <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setTransactionStatus('pending');

      const ethereumAddress = await getConnectedAccount();
      if (!ethereumAddress) {
        throw new Error('No Ethereum address connected');
      }

      // Emit createRoom event and wait for roomCreated response
      socket.emit('createRoom', { betAmount: parseFloat(betAmount), ethereumAddress });

      // Wait for roomCreated event
      const roomCreatedPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Room creation timed out'));
        }, 30000);

        socket.once('roomCreated', (data: { roomId: string }) => {
          clearTimeout(timeout);
          resolve(data.roomId);
        });
      });

      const roomId = await roomCreatedPromise;

      // Create room on blockchain
      await createRoomOnBlockchain(roomId, parseFloat(betAmount), (status) => {
        setTransactionStatus(status);
      });

      setCreatedRoomId(roomId);
      setShowRoomCreated(true);
    } catch (error: any) {
      console.error('Error creating room:', error);
      setError(error.message || 'Failed to create room');
      setTransactionStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }

    if (!roomId) {
      setError('Please enter a room ID');
      return;
    }

    if (!betAmount || isNaN(parseFloat(betAmount)) || parseFloat(betAmount) <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setTransactionStatus('pending');

      const ethereumAddress = await getConnectedAccount();
      if (!ethereumAddress) {
        throw new Error('No Ethereum address connected');
      }

      // Join room on blockchain first
      await joinRoomOnBlockchain(roomId, parseFloat(betAmount), (status) => {
        setTransactionStatus(status);
      });

      // Only proceed with socket join if blockchain transaction was successful
      if (transactionStatus === 'confirmed') {
        socket.emit('joinRoom', { roomId, ethereumAddress });
        onJoinRoom(roomId, false, parseFloat(betAmount));
      }
    } catch (error: any) {
      console.error('Error joining room:', error);
      setError(error.message || 'Failed to join room');
      setTransactionStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyRoomId = () => {
    if (createdRoomId) {
      navigator.clipboard.writeText(createdRoomId);
      alert('Room ID copied to clipboard!');
    }
  };

  return (
    <Container>
      <NavBar>
        <Logo>
          Monad Realm
        </Logo>
        <WalletContainer>
          <WalletLogo onClick={() => setShowWallet(!showWallet)} />
            
          <WalletWrapper isVisible={showWallet}>
            <GameWallet playerAddress={connectedAccount} isBlockchainConnected={isBlockchainConnected} />
          </WalletWrapper>
        </WalletContainer>
      </NavBar>

      <Title>Monad Realm</Title>
      <Card>
        {showRoomCreated ? (
          <>
            <RoomInfo>
              <SuccessMessage>Room Created Successfully!</SuccessMessage>
              <RoomId>{createdRoomId}</RoomId>
              <ShareText>Share this ID with other players</ShareText>
              <CopyButton onClick={copyRoomId}>
                Copy Room ID
              </CopyButton>
              {transactionStatus === 'confirmed' && (
                <ButtonGroup>
                  <Button onClick={() => {
                    if (createdRoomId && betAmount) {
                      const betAmountNum = parseFloat(betAmount);
                      if (!isNaN(betAmountNum)) {
                        onJoinRoom(createdRoomId, true, betAmountNum);
                      }
                    }
                  }}>
                    Join Room
                  </Button>
                  <Button onClick={() => {
                    setShowRoomCreated(false);
                    setCreatedRoomId('');
                    setTransactionStatus('idle');
                  }}>
                    Back
                  </Button>
                </ButtonGroup>
              )}
            </RoomInfo>
          </>
        ) : !showCreateRoom && !showJoinRoom ? (
          <ButtonGroup>
            <Button onClick={() => setShowCreateRoom(true)}>Create Room</Button>
            <Button onClick={() => setShowJoinRoom(true)}>Join Room</Button>
          </ButtonGroup>
        ) : showCreateRoom ? (
          <>
            <Label>Set Bet Amount (MON)</Label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter bet amount"
            />
            <ButtonGroup>
              <Button onClick={handleCreateRoom} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Room'}
              </Button>
              <Button onClick={() => setShowCreateRoom(false)}>Back</Button>
            </ButtonGroup>
            {transactionStatus !== 'idle' && (
              <TransactionStatusIndicator status={transactionStatus}>
                {transactionStatus === 'pending' && 'Confirming transaction...'}
                {transactionStatus === 'confirmed' && 'Transaction confirmed!'}
                {transactionStatus === 'failed' && 'Transaction failed'}
              </TransactionStatusIndicator>
            )}
            {error && (
              <p style={{ color: 'red', marginTop: '1rem' }}>
                {error}
              </p>
            )}
          </>
        ) : (
          <>
            <Label>Room ID</Label>
            <Input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
            />
            <Label>Bet Amount (MON)</Label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter bet amount"
            />
            <ButtonGroup>
              <Button onClick={handleJoinRoom} disabled={isLoading}>
                {isLoading ? 'Joining...' : 'Join Room'}
              </Button>
              <Button onClick={() => setShowJoinRoom(false)}>Back</Button>
            </ButtonGroup>
            {transactionStatus !== 'idle' && (
              <TransactionStatusIndicator status={transactionStatus}>
                {transactionStatus === 'pending' && 'Confirming transaction...'}
                {transactionStatus === 'confirmed' && 'Transaction confirmed!'}
                {transactionStatus === 'failed' && 'Transaction failed'}
              </TransactionStatusIndicator>
            )}
            {error && (
              <p style={{ color: 'red', marginTop: '1rem' }}>
                {error}
              </p>
            )}
          </>
        )}
      </Card>
      
      {isLoading && (
        <LoadingOverlay>
          <LoadingContent>
            <h3>Processing Transaction</h3>
            <LoadingSpinner />
            <p>Please wait while we process your transaction...</p>
            {transactionStatus === 'pending' && (
              <p>Confirming transaction on blockchain...</p>
            )}
            {transactionStatus === 'confirmed' && (
              <p>Transaction confirmed! Preparing game...</p>
            )}
            {transactionStatus === 'failed' && (
              <p>Transaction failed. Please try again.</p>
            )}
          </LoadingContent>
        </LoadingOverlay>
      )}
    </Container>
  );
};

export default HomeScreen; 