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

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
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

const Button = styled.button`
  padding: 1rem 1.5rem;
  background: linear-gradient(45deg, #61dafb, #2196f3);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.2);

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
    box-shadow: 0 6px 20px rgba(33, 150, 243, 0.3);
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


const RoomInfo = styled.div`
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
      // Generate room ID first
      const roomId = Math.random().toString(36).substring(2, 8);
      
      // Create room on blockchain first
      await createRoomOnBlockchain(
        roomId,
        parseFloat(betAmount),
        (status) => setTransactionStatus(status)
      );
      
      // After blockchain confirmation, create room on socket.io server
      if (socket) {
        socket.emit('createRoom', { 
          roomId,
          betAmount: parseFloat(betAmount),
          ethereumAddress 
        });

        // Listen for room creation confirmation
        socket.once('roomCreated', (data) => {
          if (data.roomId === roomId) {
            setCreatedRoomId(roomId);
            setShowRoomCreated(true);
            setShowCreateRoom(false);
            setTransactionStatus('confirmed');
          }
        });

        // Listen for errors
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
      // First verify the room exists and get its info
      const roomInfo = await getRoomInfoFromBlockchain(roomId);
      
      if (!roomInfo.isActive) {
        throw new Error('Room does not exist or is no longer active');
      }

      // Join room on blockchain
      await joinRoomOnBlockchain(roomId, parseFloat(betAmount));
      
      // After blockchain confirmation, join room on socket.io server
      if (socket) {
        socket.emit('joinRoom', { 
          roomId, 
          ethereumAddress,
          betAmount: parseFloat(betAmount)
        });

        // Listen for room join confirmation
        socket.once('roomJoined', (data) => {
          if (data.roomId === roomId) {
            setTransactionStatus('confirmed');
            onJoinRoom(roomId);
          }
        });

        // Listen for errors
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

      // Encode the fuse key with the user's address
      const encodedFuseKey = encodeFuseKey(ethereumAddress);

      // First, get the signature from the server
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

      // Get the provider and signer from the user's wallet
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Get the contract instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Call the mint function directly from the user's wallet
      const tx = await contract.mint(signatureData.signature);
      
      // Wait for the transaction to be mined
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
              <RoomInfo>
                <SuccessMessage>Room Created Successfully!</SuccessMessage>
                <RoomId>{createdRoomId}</RoomId>
                <ShareText>Share this ID with other players</ShareText>
                <CopyButton onClick={handleCopyRoomId}>
                  Copy Room ID
                </CopyButton>
                {transactionStatus === 'confirmed' && (
                  <ButtonGroup>
                    <Button onClick={handleJoinCreatedRoom}>
                      Join Room
                    </Button>
                    <Button onClick={() => handleButtonClick(() => {
                      setShowRoomCreated(false);
                      setCreatedRoomId('');
                      setTransactionStatus('idle');
                    })}>
                      Back
                    </Button>
                  </ButtonGroup>
                )}
              </RoomInfo>
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
                  <ButtonGroup>
                    <Button onClick={() => handleButtonClick(handleCreateRoom)} disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Room'}
                    </Button>
                    <Button onClick={() => handleButtonClick(() => setShowCreateRoom(false))}>Back</Button>
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
                    <Button onClick={() => handleButtonClick(handleJoinRoom)} disabled={isLoading}>
                      {isLoading ? 'Joining...' : 'Join Room'}
                    </Button>
                    <Button onClick={() => handleButtonClick(() => setShowJoinRoom(false))}>Back</Button>
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
                <ButtonGroup>
                  <Button onClick={() => handleButtonClick(() => setShowCreateRoom(true))}>Create Room</Button>
                  <Button onClick={() => handleButtonClick(() => setShowJoinRoom(true))}>Join Room</Button>
                  <Button onClick={() => handleButtonClick(() => setShowPvPMode(false))}>Back</Button>
                </ButtonGroup>
              )}
            </>
          ) : (
            <ButtonGroup>
              <Button onClick={handleSinglePlayerClick}>
                SINGLE PLAYER
              </Button>
              <Button onClick={() => handleButtonClick(() => setShowPvPMode(true))}>
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