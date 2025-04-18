import { ethers } from 'ethers';
import { 
  getContract, 
  getCurrentAccount, 
  getBalance, 
  requestAccount, 
  switchToMonadTestnet 
} from '../config/blockchain';

// Transaction status types
export type TransactionStatus = 'idle' | 'pending' | 'confirmed' | 'failed';

// Function to get the currently connected account
export const getConnectedAccount = async (): Promise<string | null> => {
  try {
    const account = await getCurrentAccount();
    return account;
  } catch (error) {
    console.error('Error getting connected account:', error);
    return null;
  }
};

// Function to connect to the blockchain
export const connectWallet = async () => {
  try {
    // Request account access
    const account = await requestAccount();
    
    // Switch to Monad testnet
    await switchToMonadTestnet();
    
    // Get the contract instance
    const contract = getContract();
    
    return {
      account,
      contract
    };
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    throw new Error('Failed to connect wallet. Please make sure MetaMask is installed and unlocked.');
  }
};

// Function to create a room on the blockchain
export const createRoomOnBlockchain = async (roomId: string, betAmount: number, onStatusChange?: (status: TransactionStatus) => void) => {
  try {
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    console.log('Attempting to create room on blockchain:', roomId, 'with bet amount:', betAmount);
    onStatusChange?.('pending');
    const { contract } = await connectWallet();
    
    // Convert bet amount to Wei (1 MON = 10^18 Wei)
    const betAmountWei = ethers.utils.parseEther(betAmount.toString());
    
    // First check if the room already exists
    try {
      const roomInfo = await contract.getRoomInfo(roomId);
      console.log('Room info retrieved:', roomInfo);
      
      if (roomInfo.isActive) {
        throw new Error('Room already exists');
      }
    } catch (error: any) {
      // If the error is not about the room not existing, rethrow it
      if (!error.message.includes('Room does not exist')) {
        console.error('Error checking room info:', error);
        throw error;
      }
      // Otherwise, continue with room creation
    }
    
    // Estimate gas first
    try {
      await contract.estimateGas.createRoom(roomId, betAmountWei, {
        value: betAmountWei
      });
    } catch (error: any) {
      console.error('Gas estimation failed:', error);
      throw new Error(`Transaction would fail: ${error.message || 'Unknown error'}`);
    }
    
    // Create room transaction
    const tx = await contract.createRoom(roomId, betAmountWei, {
      value: betAmountWei
    });
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    onStatusChange?.('confirmed');
    return receipt;
  } catch (error: any) {
    console.error('Error creating room on blockchain:', error);
    onStatusChange?.('failed');
    
    // Provide more specific error messages
    if (error.message.includes('user rejected')) {
      throw new Error('Transaction was rejected by user');
    } else if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds to complete the transaction');
    } else if (error.message.includes('Room already exists')) {
      throw new Error('A room with this ID already exists');
    } else {
      throw new Error(`Failed to create room: ${error.message || 'Unknown error'}`);
    }
  }
};

// Function to join a room on the blockchain
export const joinRoomOnBlockchain = async (roomId: string, betAmount: number, onStatusChange?: (status: TransactionStatus) => void) => {
  try {
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    console.log('Attempting to join room on blockchain:', roomId, 'with bet amount:', betAmount);
    onStatusChange?.('pending');
    const { contract } = await connectWallet();
    
    // Convert bet amount to Wei (1 MON = 10^18 Wei)
    const betAmountWei = ethers.utils.parseEther(betAmount.toString());
    
    // First check if the room exists
    try {
      const roomInfo = await contract.getRoomInfo(roomId);
      console.log('Room info retrieved:', roomInfo);
      
      if (!roomInfo.isActive) {
        throw new Error('Room does not exist');
      }
      
      // Check if bet amount matches
      const roomBetAmount = ethers.utils.formatEther(roomInfo.betAmount);
      if (parseFloat(roomBetAmount) !== betAmount) {
        throw new Error(`Incorrect bet amount. Room requires ${roomBetAmount} MON, but you provided ${betAmount} MON`);
      }
    } catch (error: any) {
      console.error('Error checking room info:', error);
      if (error.message.includes('Room does not exist')) {
        throw new Error('The room you are trying to join does not exist');
      }
      throw error;
    }
    
    // Estimate gas first
    try {
      await contract.estimateGas.joinRoom(roomId, {
        value: betAmountWei
      });
    } catch (error: any) {
      console.error('Gas estimation failed:', error);
      throw new Error(`Transaction would fail: ${error.message || 'Unknown error'}`);
    }
    
    // Join room transaction
    const tx = await contract.joinRoom(roomId, {
      value: betAmountWei
    });
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    onStatusChange?.('confirmed');
    return receipt;
  } catch (error: any) {
    console.error('Error joining room on blockchain:', error);
    onStatusChange?.('failed');
    
    // Provide more specific error messages
    if (error.message.includes('user rejected')) {
      throw new Error('Transaction was rejected by user');
    } else if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds to complete the transaction');
    } else if (error.message.includes('Room does not exist')) {
      throw new Error('The room you are trying to join does not exist');
    } else if (error.message.includes('Incorrect bet amount')) {
      throw new Error('The bet amount does not match the room requirements');
    } else {
      throw new Error(`Failed to join room: ${error.message || 'Unknown error'}`);
    }
  }
};

// Function to end a game on the blockchain and distribute winnings
export const endGameOnBlockchain = async (
  roomId: string, 
  winnerAddress: string, 
  onStatusChange?: (status: TransactionStatus) => void
): Promise<void> => {
  try {
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    if (!winnerAddress) {
      throw new Error('Winner address is required');
    }
    
    // Validate that winnerAddress is a valid Ethereum address
    if (!ethers.utils.isAddress(winnerAddress)) {
      throw new Error('Invalid winner address format');
    }
    
    console.log('Attempting to end game on blockchain:', roomId, 'with winner:', winnerAddress);
    onStatusChange?.('pending');
    const { contract } = await connectWallet();
    
    // First check if the room exists
    try {
      const roomInfo = await contract.getRoomInfo(roomId);
      console.log('Room info:', roomInfo);
      
      if (!roomInfo.isActive) {
        throw new Error('Room does not exist or is not active');
      }
    } catch (error: any) {
      console.error('Error checking room:', error);
      if (error.message.includes('Room does not exist')) {
        throw new Error('Room does not exist');
      }
      throw error;
    }
    
    // Estimate gas for the transaction
    try {
      const gasEstimate = await contract.estimateGas.endGame(roomId, winnerAddress);
      console.log('Gas estimate:', gasEstimate.toString());
      
      // Send transaction with 20% buffer for gas
      const tx = await contract.endGame(roomId, winnerAddress, {
        gasLimit: gasEstimate.mul(120).div(100)
      });
      
      console.log('Transaction sent:', tx.hash);
      onStatusChange?.('pending');
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      
      if (receipt.status === 1) {
        onStatusChange?.('confirmed');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Error in endGame transaction:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Transaction was rejected by user');
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds to complete transaction');
      } else if (error.message.includes('Room does not exist')) {
        throw new Error('Room does not exist');
      } else {
        throw new Error('Failed to end game: ' + error.message);
      }
    }
  } catch (error: any) {
    console.error('Error in endGameOnBlockchain:', error);
    onStatusChange?.('failed');
    throw error;
  }
};

// Function to withdraw winnings from the blockchain
export const withdrawFromBlockchain = async () => {
  try {
    const { contract } = await connectWallet();
    
    // Withdraw transaction
    const tx = await contract.withdraw();
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    return receipt;
  } catch (error) {
    console.error('Error withdrawing from blockchain:', error);
    throw error;
  }
};

// Function to get room info from the blockchain
export const getRoomInfoFromBlockchain = async (roomId: string) => {
  try {
    const { contract } = await connectWallet();
    
    // Get room info
    const roomInfo = await contract.getRoomInfo(roomId);
    
    return {
      roomId: roomInfo.roomId,
      betAmount: ethers.utils.formatEther(roomInfo.betAmount),
      potAmount: ethers.utils.formatEther(roomInfo.potAmount),
      playerCount: roomInfo.playerCount.toNumber(),
      isActive: roomInfo.isActive,
      winner: roomInfo.winner
    };
  } catch (error) {
    console.error('Error getting room info from blockchain:', error);
    throw error;
  }
};

// Function to get player balance from the blockchain
export const getPlayerBalanceFromBlockchain = async (playerAddress: string) => {
  try {
    const { contract } = await connectWallet();
    
    // Get player balance
    const balance = await contract.getPlayerBalance(playerAddress);
    
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error('Error getting player balance from blockchain:', error);
    throw error;
  }
};

// Function to get the current account's balance
export const getCurrentBalance = async () => {
  try {
    const account = await getCurrentAccount();
    const balance = await getBalance(account);
    
    return balance;
  } catch (error) {
    console.error('Error getting current balance:', error);
    throw error;
  }
}; 