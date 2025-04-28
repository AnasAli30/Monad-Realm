import { ethers } from 'ethers';

const FUSE_SECRET_KEY = import.meta.env.VITE_FUSE_SECRET_KEY || ''; // This should match the server's secret key
export const encodeFuseKey = (address: string): string => {
  // Create a unique string by combining address and secret key
  const combinedString = `${address}:${FUSE_SECRET_KEY}`;
  
  // Hash the combined string
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(combinedString));
  
  // Take first 32 characters of the hash as the encoded key
  return hash;
}; 