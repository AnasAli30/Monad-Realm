import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { createRoomOnBlockchain, joinRoomOnBlockchain, TransactionStatus, getConnectedAccount, getRoomInfoFromBlockchain } from '../services/blockchainService';
import GameWallet from './GameWallet';
import { AudioManager } from '../utils/AudioManager';
import { SoundOnIcon } from '../assets/icons/sound-on';
import { SoundOffIcon } from '../assets/icons/sound-off';
import { AudioTest } from './AudioTest';
import Settings from './Settings';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { encodeFuseKey } from '../utils/fuseEncoder';
import CONTRACT_ABI from '../utils/contractAbi.json';
import settingsIcon from '../assets/icons/settings-icon.svg';
import NFTPassDisplay from './NFTPassDisplay';
const CONTRACT_ADDRESS = '0x3543ab02430F5411775afd00310565305716b0e5';

interface HomeScreenProps {
  socket: any;
  onJoinRoom: (roomId: string) => void;
  onPlaceBet: (amount: number) => void;
  onBackToHome: () => void;
  onStartSinglePlayer: () => void;
  currentRoom: string | null;
  isBlockchainConnected: boolean;
  ethereumAddress: string | null;
}

interface GameRoomInfo {
  id: string;
  creator: string;
  betAmount: number;
  isPrivate: boolean;
  createdAt: number;
  players: number;
  maxPlayers: number;
}

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.01);
  }
  100% {
    transform: scale(1);
  }
`;

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const Container = styled.div<{ isGameScreen: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-width: 100vw;
  background: url('/images/pvp-background.jpeg') no-repeat center center fixed;
  background-size: cover;
  color: white;
  padding: 0rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(38, 38, 38, 0.15) 0%, 
      rgba(42, 42, 42, 0.48) 100%
    );
    z-index: 0;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    pointer-events: none;
  }
`;

const NavBar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  height: 20px;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.44);
  z-index: 1000;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(97, 218, 251, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 300px;
  margin-top: 2rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 1rem 2rem;
  background: ${props => {
    switch (props.variant) {
      case 'primary':
        return 'linear-gradient(45deg, #4CAF50, #45a049)';
      case 'secondary':
        return 'linear-gradient(45deg, #2196F3, #1976D2)';
      case 'danger':
        return 'linear-gradient(45deg, #f44336, #d32f2f)';
      default:
        return 'linear-gradient(45deg, #4CAF50, #45a049)';
    }
  }};
  color: white;
  border: 10px solid rgb(255, 255, 255) !important;
  border-radius: 160px !important;
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: 600;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 1px;
  
  box-shadow: ${props => {
    switch (props.variant) {
      case 'primary':
        return '0 4px 15px rgba(76, 175, 80, 0.3)';
      case 'secondary':
        return '0 4px 15px rgba(33, 150, 243, 0.3)';
      case 'danger':
        return '0 4px 15px rgba(244, 67, 54, 0.3)';
      default:
        return '0 4px 15px rgba(76, 175, 80, 0.3)';
    }
  }};

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0)
    );
    transition: left 0.7s ease;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${props => {
      switch (props.variant) {
        case 'primary':
          return '0 6px 20px rgba(76, 175, 80, 0.4)';
        case 'secondary':
          return '0 6px 20px rgba(33, 150, 243, 0.4)';
        case 'danger':
          return '0 6px 20px rgba(244, 67, 54, 0.4)';
        default:
          return '0 6px 20px rgba(76, 175, 80, 0.4)';
      }
    }};
  }

  &:hover::before {
    left: 100%;
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    background: #666;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Title = styled.h1`
  font-size: 2rem !important;
  margin: 0;
  background: linear-gradient(45deg, #61dafb, #2196f3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(97, 218, 251, 0.3);
  animation: ${pulse} 2s infinite ease-in-out;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 2.5rem;
  border-radius: 16px;
  width: 550px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 600px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  position: relative;
  z-index: 1;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }
`;

const RoomInfoContainer = styled.div`
  margin-bottom: 2rem;
`;

const SuccessMessage = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const RoomId = styled.p`
  font-size: 1.2rem;
  margin-bottom: 1rem;
`;

const ShareText = styled.p`
  margin-bottom: 1rem;
`;

const CopyButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #357abd;
  }
`;

const TransactionStatusIndicator = styled.p<{ status: TransactionStatus }>`
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  text-align: center;
  font-weight: 500;
  animation: ${pulse} 2s infinite ease-in-out;
  background: ${({ status }) => {
    switch (status) {
      case 'pending':
        return 'rgba(255, 215, 0, 0.1)';
      case 'confirmed':
        return 'rgba(76, 175, 80, 0.1)';
      case 'failed':
        return 'rgba(244, 67, 54, 0.1)';
      default:
        return 'transparent';
    }
  }};
  border: 1px solid ${({ status }) => {
    switch (status) {
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
  color: ${({ status }) => {
    switch (status) {
      case 'pending':
        return '#ffd700';
      case 'confirmed':
        return '#4caf50';
      case 'failed':
        return '#f44336';
      default:
        return 'white';
    }
  }};
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const LoadingContent = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(97, 218, 251, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(97, 218, 251, 0.1);
  border-top: 4px solid #61dafb;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: ${spin} 1s linear infinite;
  margin: 0 auto 1rem;
`;

const WalletLogo = styled.img`
  width: 40px;
  height: 40px;
  cursor: pointer;
`;

const WalletWrapper = styled.div<{ $connected: boolean }>`
  display: ${({ $connected }) => ($connected ? 'block' : 'none')};
  margin-left: 1rem;
`;

const SoundToggle = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const SettingsButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.3s ease;
  border-radius: 8px;
  
  &:hover {
    background: rgba(97, 218, 251, 0.2);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const SettingsIcon = styled.img`
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1);
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.8rem;
  color: #61dafb;
  font-size: 1.1rem;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 1rem;
  border: 1px solid rgba(97, 218, 251, 0.3);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: white;
  width: 100%;
  margin-bottom: 1.5rem;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #61dafb;
    box-shadow: 0 0 0 3px rgba(97, 218, 251, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const MintButton = styled.button`
  padding: 0.5rem 1rem;
  background: linear-gradient(45deg, #61dafb, #2196f3);
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
  }

  &:disabled {
    background: #666;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ConnectWalletMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color:rgb(255, 255, 255);
  font-size: 1.2rem;
  font-weight: 600;
  width: 420px;
  
  p {
    margin-bottom: 1rem;
    line-height: 1.5;
  }
`;

const RoomPool = styled.div`
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(97, 218, 251, 0.2);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(97, 218, 251, 0.3);
    border-radius: 4px;
  }
`;

const RoomCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(97, 218, 251, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(97, 218, 251, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const RoomCardInfo = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 0;
`;

const RoomDetails = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const RoomCreator = styled.span`
  color: #61dafb;
  font-weight: 500;
`;

const RoomBet = styled.span`
  color: #4caf50;
  font-weight: 500;
`;

const RoomPlayers = styled.span`
  color: #ff9800;
`;

const PrivateToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.2);
    transition: .4s;
    border-radius: 34px;

    &:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
  }

  input:checked + span {
    background-color: #61dafb;
  }

  input:checked + span:before {
    transform: translateX(26px);
  }
`;

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  socket, 
  onJoinRoom, 
  onPlaceBet,
  onBackToHome,
  onStartSinglePlayer,
  currentRoom,
  isBlockchainConnected,
  ethereumAddress
}) => {
  const audioManager = AudioManager.getInstance();
  const [showPvPMode, setShowPvPMode] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [showRoomCreated, setShowRoomCreated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [betAmount, setBetAmount] = useState('0.1');
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);
  const [publicRooms, setPublicRooms] = useState<GameRoomInfo[]>([]);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);

  const handleButtonClick = (callback: () => void) => {
    audioManager.playClickSound();
    callback();
  };
  
  const handleOpenSettings = () => {
    setShowSettings(true);
  };
  
  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleSoundToggle = () => {
    audioManager.toggleMute();
    setIsMuted(audioManager.isSoundMuted());
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(createdRoomId);
  };

  const handleJoinCreatedRoom = () => {
    onJoinRoom(createdRoomId);
  };

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setTransactionStatus('pending');
    setError(null);
    try {
      const roomId = Math.random().toString(36).substring(2, 8);
      
      await createRoomOnBlockchain(
        roomId,
        parseFloat(betAmount),
        (status) => setTransactionStatus(status)
      );
      
      if (socket) {
        socket.emit('createRoom', { 
          roomId,
          betAmount: parseFloat(betAmount),
          ethereumAddress,
          isPrivate: isPrivateRoom
        });

        socket.once('roomCreated', (data) => {
          if (data.roomId === roomId) {
            setCreatedRoomId(roomId);
            setShowRoomCreated(true);
            setShowCreateRoom(false);
            setTransactionStatus('confirmed');
          }
        });

        socket.once('error', (error) => {
          throw new Error(error.message);
        });
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setTransactionStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    setIsLoading(true);
    setTransactionStatus('pending');
    setError(null);
    try {
      const roomInfo = await getRoomInfoFromBlockchain(roomId);
      
      if (!roomInfo.isActive) {
        throw new Error('Room does not exist or is no longer active');
      }

      await joinRoomOnBlockchain(roomId, parseFloat(betAmount));
      
      if (socket) {
        socket.emit('joinRoom', { 
          roomId, 
          ethereumAddress,
          betAmount: parseFloat(betAmount)
        });

        socket.once('roomJoined', (data) => {
          if (data.roomId === roomId) {
            setTransactionStatus('confirmed');
            onJoinRoom(roomId);
          }
        });

        socket.once('error', (error) => {
          throw new Error(error.message);
        });
      }
    } catch (err) {
      console.error('Error joining room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setTransactionStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSinglePlayerClick = () => {
    handleButtonClick(onStartSinglePlayer);
  };

  const handleMint = async () => {
    if (!isBlockchainConnected || !ethereumAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsMinting(true);

      const encodedFuseKey = encodeFuseKey(ethereumAddress);

      const signatureResponse = await fetch('http://localhost:3001/api/generate-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: ethereumAddress,
          encodedFuseKey,
        }),
      });

      const signatureData = await signatureResponse.json();

      if (!signatureResponse.ok) {
        throw new Error(signatureData.error || 'Failed to get signature');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.mint(signatureData.signature);
      
      await tx.wait();

      toast.success('NFT minted successfully!', {
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      toast.error(error.message || 'Failed to mint NFT');
    } finally {
      setIsMinting(false);
    }
  };

  const handleNFTStatusChange = (status: boolean) => {
    setHasNFT(status);
  };

  useEffect(() => {
    if (socket) {
      socket.on('publicRooms', (rooms: GameRoomInfo[]) => {
        setPublicRooms(rooms);
      });

      socket.emit('getPublicRooms');

      const interval = setInterval(() => {
        socket.emit('getPublicRooms');
      }, 10000);

      return () => {
        clearInterval(interval);
        socket.off('publicRooms');
      };
    }
  }, [socket]);

  const handleJoinPublicRoom = (roomId: string, betAmount: number) => {
    setRoomId(roomId);
    setBetAmount(betAmount.toString());
    handleJoinRoom();
  };

  return (
    <>
      <NavBar>
        <Title>Monad Realm</Title>
        <NavRight>
          <SettingsButton onClick={handleOpenSettings}>
            <SettingsIcon src={settingsIcon} alt="Settings" />
          </SettingsButton>
        </NavRight>
      </NavBar>
      <Container isGameScreen={showPvPMode}>
        {showSettings && <Settings onClose={handleCloseSettings} />}
        <SoundToggle onClick={handleSoundToggle}>
          {isMuted ? <SoundOffIcon /> : <SoundOnIcon />}
        </SoundToggle>
        <Card>
          {!isBlockchainConnected ? (
            <ConnectWalletMessage>
              <p>Please connect your wallet to access the game</p>
              <p>You need to connect your wallet to play PvP mode and earn rewards</p>
            </ConnectWalletMessage>
          ) : !hasNFT ? (
            <NFTPassDisplay 
              ethereumAddress={ethereumAddress || ''} 
              onNFTStatusChange={handleNFTStatusChange}
            />
          ) : showRoomCreated ? (
            <>
              <RoomInfoContainer>
                <SuccessMessage>Room Created Successfully!</SuccessMessage>
                <RoomId>{createdRoomId}</RoomId>
                <ShareText>Share this ID with other players</ShareText>
                <CopyButton onClick={handleCopyRoomId}>
                  Copy Room ID
                </CopyButton>
                {transactionStatus === 'confirmed' && (
                  <ButtonGroup>
                    <Button variant="primary" onClick={handleJoinCreatedRoom}>
                      Join Room
                    </Button>
                    <Button variant="danger" onClick={() => handleButtonClick(() => {
                      setShowRoomCreated(false);
                      setCreatedRoomId('');
                      setTransactionStatus('idle');
                    })}>
                      Back
                    </Button>
                  </ButtonGroup>
                )}
              </RoomInfoContainer>
            </>
          ) : showPvPMode ? (
            <>
              {showCreateRoom ? (
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
                  <PrivateToggle>
                    <span>Private Room</span>
                    <ToggleSwitch>
                      <input
                        type="checkbox"
                        checked={isPrivateRoom}
                        onChange={(e) => setIsPrivateRoom(e.target.checked)}
                      />
                      <span></span>
                    </ToggleSwitch>
                  </PrivateToggle>
                  <ButtonGroup>
                    <Button variant="primary" onClick={() => handleButtonClick(handleCreateRoom)} disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Room'}
                    </Button>
                    <Button variant="danger" onClick={() => handleButtonClick(() => setShowCreateRoom(false))}>
                      Back
                    </Button>
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
              ) : showJoinRoom ? (
                <>
                  <Label>Join Private Room</Label>
                  <Input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter private room ID"
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
                    <Button variant="primary" onClick={() => handleButtonClick(handleJoinRoom)} disabled={isLoading}>
                      {isLoading ? 'Joining...' : 'Join Private Room'}
                    </Button>
                    <Button variant="danger" onClick={() => handleButtonClick(() => setShowJoinRoom(false))}>
                      Back
                    </Button>
                  </ButtonGroup>

                  <Label style={{ marginTop: '2rem' }}>Available Public Rooms</Label>
                  <RoomPool>
                    {publicRooms.map((room) => (
                      <RoomCard key={room.id}>
                        <RoomCardInfo>
                          <RoomCreator>
                            {room.creator.substring(0, 6)}...{room.creator.substring(38)}
                          </RoomCreator>
                          <RoomDetails>
                            <RoomBet>{room.betAmount} MON</RoomBet>
                            <RoomPlayers>{room.players}/{room.maxPlayers} Players</RoomPlayers>
                            <span>{Math.floor((Date.now() - room.createdAt) / 1000 / 60)}m ago</span>
                          </RoomDetails>
                        </RoomCardInfo>
                        <Button
                          variant="secondary"
                          onClick={() => handleJoinPublicRoom(room.id, room.betAmount)}
                          disabled={isLoading}
                        >
                          Join
                        </Button>
                      </RoomCard>
                    ))}
                    {publicRooms.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        No public rooms available
                      </div>
                    )}
                  </RoomPool>
                </>
              ) : (
                <ButtonGroup>
                  <Button variant="primary" onClick={() => handleButtonClick(() => setShowCreateRoom(true))}>
                    Create Room
                  </Button>
                  <Button variant="secondary" onClick={() => handleButtonClick(() => setShowJoinRoom(true))}>
                    Join Room
                  </Button>
                  <Button variant="danger" onClick={() => handleButtonClick(() => setShowPvPMode(false))}>
                    Back
                  </Button>
                </ButtonGroup>
              )}
            </>
          ) : (
            <ButtonGroup>
              <Button variant="primary" onClick={handleSinglePlayerClick}>
                SINGLE PLAYER
              </Button>
              <Button variant="secondary" onClick={() => handleButtonClick(() => setShowPvPMode(true))}>
                PVP
              </Button>
            </ButtonGroup>
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
    </>
  );
};

export default HomeScreen; 