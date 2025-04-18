import { ethers } from 'ethers';
import { TransactionStatus } from '../types';
import { serverWallet, CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/blockchain';

export async function endGameOnBlockchain(
  roomId: string,
  winnerAddress: string,
  onStatusUpdate: (status: TransactionStatus) => void
): Promise<void> {
  try {
    onStatusUpdate('pending');

    // Get contract instance
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      serverWallet
    );

    // Estimate gas for the transaction
    const gasEstimate = await contract.endGame.estimateGas(roomId, winnerAddress);
    
    // Send transaction with 20% buffer for gas
    const tx = await contract.endGame(roomId, winnerAddress, {
      gasLimit: gasEstimate * 120n / 100n
    });

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      onStatusUpdate('confirmed');
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error: any) {
    console.error('Error in endGameOnBlockchain:', error);
    onStatusUpdate('failed');
    throw error;
  }
} 