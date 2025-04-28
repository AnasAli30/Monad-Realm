import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { ethers } from 'ethers';
import { MONAD_TESTNET, addMonadTestnetToMetaMask, switchToMonadTestnet } from '../config/blockchain';

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const WalletContainer = styled.div`
  position: fixed;
  top: 70px;
  left: 20px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(30, 30, 30, 0.85) 100%);
  padding: 12px;
  border-radius: 12px;
  color: white;
  text-align: center;
  z-index: 1000;
  width: 150px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 10px rgba(97, 218, 251, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${slideIn} 0.4s ease-out;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(97, 218, 251, 0.2);
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    width: 135px;
    padding: 10px;
  }
`;

const StatusDot = styled.span<{ connected: boolean }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.connected ? '#4caf50' : '#f44336'};
  margin-right: 6px;
  box-shadow: 0 0 5px ${props => props.connected ? 'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)'};
  animation: ${pulse} 2s infinite ease-in-out;
`;

const WalletInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: ${fadeIn} 0.3s ease-out;
`;

const StatusText = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  margin: 0 0 5px 0;
  font-weight: 500;
  color: #61dafb;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const ConnectButton = styled.button`
  background: linear-gradient(135deg, #61dafb 0%, #4fa8d5 100%);
  color: black;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 8px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  width: 100%;
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
    background: linear-gradient(135deg, #7de3ff 0%, #61dafb 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
  
  &:hover:before {
    left: 100%;
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    background: linear-gradient(135deg, #cccccc 0%, #9e9e9e 100%);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  &.loading {
    position: relative;
    color: transparent;
    
    &::after {
      content: '';
      position: absolute;
      top: calc(50% - 7px);
      left: calc(50% - 7px);
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0, 0, 0, 0.3);
      border-top-color: black;
      border-radius: 50%;
      animation: ${spin} 1s linear infinite;
    }
  }
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 5px 10px;
  }
`;

const Balance = styled.div`
  margin: 5px 0;
  font-weight: bold;
  font-size: 1.1rem;
  color: #4caf50;
  text-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
  animation: ${pulse} 2s infinite ease-in-out;
  padding: 3px;
  border-radius: 4px;
  background-color: rgba(76, 175, 80, 0.1);
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const Address = styled.div`
  margin-top: 3px;
  font-size: 0.75rem;
  word-break: break-all;
  opacity: 0.8;
  padding: 3px 5px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const ErrorMessage = styled.p`
  color: #f44336;
  margin-top: 6px;
  font-size: 0.75rem;
  text-align: center;
  padding: 3px 5px;
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  animation: ${fadeIn} 0.3s ease-out;
`;

interface WalletConnectProps {
  onConnect: (account: string) => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
            onConnect(accounts[0]);
            
            // Get balance
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const balance = await provider.getBalance(accounts[0]);
            setBalance(ethers.utils.formatEther(balance));
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };
    
    checkConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          onConnect(accounts[0]);
          
          // Get balance
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          provider.getBalance(accounts[0]).then(bal => {
            setBalance(ethers.utils.formatEther(bal));
          });
        } else {
          setAccount('');
          setIsConnected(false);
          onConnect('');
          setBalance('');
        }
      });
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, [onConnect]);

  const handleConnect = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      // Switch to Monad testnet
      await switchToMonadTestnet();
      
      setAccount(account);
      setIsConnected(true);
      onConnect(account);
      
      // Get balance
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(account);
      setBalance(ethers.utils.formatEther(balance));
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <WalletContainer>
      {!window.ethereum ? (
        <WalletInfo>
          <StatusText>
            <StatusDot connected={false} />
            No Wallet
          </StatusText>
          <a href="https://metamask.io/download.html" target="_blank" rel="noopener noreferrer" style={{ width: '100%' }}>
            <ConnectButton>Install MetaMask</ConnectButton>
          </a>
        </WalletInfo>
      ) : isConnected ? (
        <WalletInfo>
          <StatusText>
            <StatusDot connected={true} />
            Connected
          </StatusText>
          <Balance title={balance}>{parseInt(balance).toString()} MON</Balance>
          <Address title={account}>{formatAddress(account)}</Address>
        </WalletInfo>
      ) : (
        <WalletInfo>
          <StatusText>
            <StatusDot connected={false} />
            Wallet
          </StatusText>
          <ConnectButton 
            onClick={handleConnect} 
            disabled={isLoading}
            className={isLoading ? 'loading' : ''}
          >
            {isLoading ? ' ' : 'Connect'}
          </ConnectButton>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </WalletInfo>
      )}
    </WalletContainer>
  );
};

export default WalletConnect; 