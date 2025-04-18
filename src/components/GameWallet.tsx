import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { getPlayerBalanceFromBlockchain, withdrawFromBlockchain, TransactionStatus } from '../services/blockchainService';
import { keyframes } from 'styled-components';

const slideIn = keyframes`
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
`;

const WalletContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(30, 30, 30, 0.85) 100%);
  border-radius: 12px;
  padding: 12px;
  color: white;
  z-index: 1000;
  width: 180px;
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
    width: 150px;
    padding: 10px;
  }
`;

const WalletTitle = styled.h3`
  margin: 0 0 8px 0;
  color: #61dafb;
  font-size: 1rem;
  text-align: center;
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px rgba(97, 218, 251, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::before {
    content: "💰";
    margin-right: 5px;
  }
`;

const Balance = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 12px;
  color: #4caf50;
  text-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
  animation: ${pulse} 2s infinite ease-in-out;
  padding: 4px;
  border-radius: 4px;
  background-color: rgba(76, 175, 80, 0.1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const WithdrawButton = styled.button`
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  font-weight: 500;
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
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0)
    );
    transition: left 0.7s ease;
  }
  
  &:hover {
    background: linear-gradient(135deg, #5dc262 0%, #43a047 100%);
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
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 6px 10px;
  }
`;

const statusFade = keyframes`
  0% { opacity: 0; transform: translateY(-10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const TransactionStatusIndicator = styled.div<{ status: TransactionStatus }>`
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${statusFade} 0.3s ease-out;
  background-color: ${props => {
    switch (props.status) {
      case 'pending':
        return 'rgba(255, 215, 0, 0.9)';
      case 'confirmed':
        return 'rgba(76, 175, 80, 0.9)';
      case 'failed':
        return 'rgba(244, 67, 54, 0.9)';
      default:
        return 'transparent';
    }
  }};
  color: ${props => props.status === 'pending' ? 'black' : 'white'};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  
  &::before {
    content: '';
    display: ${props => props.status === 'pending' ? 'block' : 'none'};
    width: 12px;
    height: 12px;
    border: 2px solid rgba(0, 0, 0, 0.3);
    border-top-color: black;
    border-radius: 50%;
    margin-right: 8px;
    animation: ${spin} 1s linear infinite;
  }
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 5px 6px;
  }
`;

const ErrorMessage = styled.div`
  color: #f44336;
  margin-top: 8px;
  font-size: 0.8rem;
  text-align: center;
  padding: 4px 6px;
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  animation: ${statusFade} 0.3s ease-out;
`;

interface GameWalletProps {
  playerAddress: string;
  isBlockchainConnected: boolean;
}

const GameWallet: React.FC<GameWalletProps> = ({ playerAddress, isBlockchainConnected }) => {
 console.log(playerAddress,isBlockchainConnected)
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const fetchBalance = useCallback(async (retryCount = 0) => {
    if (!playerAddress || !isBlockchainConnected) {
      setBalance('0');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const playerBalance = await getPlayerBalanceFromBlockchain(playerAddress);
      
      // If balance is 0 and we haven't retried too many times, try again after a delay
      if (playerBalance === '0' && retryCount < 3) {
        setTimeout(() => {
          fetchBalance(retryCount + 1);
        }, 2000); // Wait 2 seconds before retrying
        return;
      }
      
      setBalance(playerBalance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance');
      
      // If we haven't retried too many times, try again after a delay
      if (retryCount < 3) {
        setTimeout(() => {
          fetchBalance(retryCount + 1);
        }, 2000);
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, [playerAddress, isBlockchainConnected]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, lastUpdated]);

  // Add event listener for balance updates
  useEffect(() => {
    const handleBalanceUpdate = () => {
      console.log('Balance update event received for address:', playerAddress);
      fetchBalance(); // Call fetchBalance when the event is received
    };

    window.addEventListener('gameWalletBalanceUpdate', handleBalanceUpdate);

    return () => {
      window.removeEventListener('gameWalletBalanceUpdate', handleBalanceUpdate);
    };
  }, [fetchBalance, playerAddress]);

  const handleWithdraw = async () => {
    if (!isBlockchainConnected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setTransactionStatus('pending');
      
      await withdrawFromBlockchain();
      
      setTransactionStatus('confirmed');
      setLastUpdated(Date.now()); // Trigger balance refresh
    } catch (error: any) {
      console.error('Error withdrawing funds:', error);
      setError(error.message || 'Failed to withdraw funds');
      setTransactionStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WalletContainer>
      <WalletTitle>Game Wallet</WalletTitle>
      <Balance title={`${balance} MON`}>
        {isLoading ? 
          <span>
            <span className="loading-dot">.</span>
            <span className="loading-dot">.</span>
            <span className="loading-dot">.</span>
          </span> 
          : `${balance} MON`}
      </Balance>
      
      <WithdrawButton 
        onClick={handleWithdraw} 
        disabled={isLoading || parseFloat(balance) <= 0 || !isBlockchainConnected}
      >
        {isLoading ? 'Processing...' : 'Withdraw Winnings'}
      </WithdrawButton>
      
      {transactionStatus !== 'idle' && (
        <TransactionStatusIndicator status={transactionStatus}>
          {transactionStatus === 'pending' && 'Transaction pending...'}
          {transactionStatus === 'confirmed' && 'Withdrawal successful!'}
          {transactionStatus === 'failed' && 'Withdrawal failed'}
        </TransactionStatusIndicator>
      )}
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </WalletContainer>
  );
};

export default GameWallet; 