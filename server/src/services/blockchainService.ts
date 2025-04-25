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

export async function depositToPlayer(
  playerAddress: string,
  amount: number,
  isReward: boolean,
  onStatusUpdate: (status: TransactionStatus) => void
): Promise<string> {
  try {
    onStatusUpdate('pending');

    // Get contract instance
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      serverWallet
    );

    // Convert amount to wei
    const amountInWei = ethers.parseEther(amount.toString());

    // Always send ETH value for both rewards and deposits
    // This ensures players can withdraw their winnings
    const txOptions = { value: amountInWei };

    // Estimate gas for the transaction
    const gasEstimate = await contract.depositToPlayer.estimateGas(
      playerAddress,
      amountInWei,
      isReward,
      txOptions
    );
    
    // Send transaction with 20% buffer for gas
    const tx = await contract.depositToPlayer(
      playerAddress,
      amountInWei,
      isReward,
  {
        ...txOptions
      }
    );

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      onStatusUpdate('confirmed');
      return tx.hash; // Return the transaction hash
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error: any) {
    console.error('Error in depositToPlayer:', error);
    onStatusUpdate('failed');
    throw error;
  }
}

export async function mintNFT(
  userAddress: string,
  signature: string,
  onStatusUpdate: (status: TransactionStatus) => void
): Promise<string> {
  try {
    onStatusUpdate('pending');

    // Get contract instance
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      serverWallet
    );

    // Estimate gas for the transaction
    const gasEstimate = await contract.mint.estimateGas(signature);
    
    // Send transaction with 20% buffer for gas
    const tx = await contract.mint(signature, {
      gasLimit: gasEstimate * 120n / 100n
    });

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      onStatusUpdate('confirmed');
      return tx.hash;
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error: any) {
    console.error('Error in mintNFT:', error);
    onStatusUpdate('failed');
    throw error;
  }
} 