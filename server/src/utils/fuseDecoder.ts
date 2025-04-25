import { ethers } from 'ethers';
import { keccak256 } from '@ethersproject/keccak256';
import { toUtf8Bytes } from '@ethersproject/strings';
import dotenv from 'dotenv';

dotenv.config();

const FUSE_SECRET_KEY = process.env.FUSE_SECRET_KEY || 'checking'; // This should match the frontend's secret key

export function decodeFuseKey(encodedKey: string, userAddress: string): { address: string } | null {
  try {
    // Verify that the address is valid
    if (!ethers.isAddress(userAddress)) {
      console.error('Invalid Ethereum address');
      return null;
    }

    // Create the expected hash using the same method as frontend
    const combinedString = `${userAddress}:${FUSE_SECRET_KEY}`;
    const expectedHash = keccak256(toUtf8Bytes(combinedString));

    // Verify that the provided hash matches the expected hash
    if (encodedKey !== expectedHash) {
      console.error('Invalid encoded key');
      return null;
    }

    return { address: userAddress };
  } catch (error) {
    console.error('Error decoding fuse key:', error);
    return null;
  }
}

export function verifyFuseKey(address: string, encodedKey: string): boolean {
  const decodedData = decodeFuseKey(encodedKey, address);
  return decodedData !== null && decodedData.address.toLowerCase() === address.toLowerCase();
} 