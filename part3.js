//part3

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import abi from './abi.js';

dotenv.config();

const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const hey = "hi"

if (!BASE_SEPOLIA_RPC_URL || !PRIVATE_KEY) {
  console.error('❌ Please set BASE_SEPOLIA_RPC_URL and PRIVATE_KEY in your .env file');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC_URL);

let wallet;
try {
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log('🔑 Wallet initialized.');
} catch (error) {
  console.error('❌ Failed to initialize wallet:', error);
  process.exit(1);
}

const contractAddress = '0x09d21d696498b1e7d80e462f0d188bd6b984a964';

let contract;
try {
  contract = new ethers.Contract(contractAddress, abi, wallet);
  console.log('📄 DevBounty Contract instantiated at:', contract.target);
} catch (error) {
  console.error('❌ Failed to instantiate DevBounty contract:', error);
  process.exit(1);
}

const vaultAbi = [
  "function locked() external view returns (bool)",
  "function unlock(bytes32 key) external"
];

async function getCurrentStage(participantAddress) {
  try {
    const stage = await contract.getCurrentStage(participantAddress);
    const stages = ["NotStarted", "CrypticPuzzle", "ExternalChallenge", "VaultUnlocking", "Completed"];
    console.log(`📈 Current Stage for ${participantAddress}: ${stages[stage] || "Unknown Stage"} (Stage ${stage})`);
    return Number(stage);
  } catch (error) {
    console.error('❌ Error fetching current stage:', error);
    process.exit(1);
  }
}

async function getVaultAddress(participantAddress) {
  try {
    const vaultAddress = await contract.getVaultAddress(participantAddress);
    console.log(`🏛️ Vault Address: ${vaultAddress}`);
    return vaultAddress;
  } catch (error) {
    console.error('❌ Error getting vault address:', error);
    process.exit(1);
  }
}

async function tryUnlockVault(vaultContract, key) {
  try {
    console.log(`\n🔓 Attempting to unlock vault with key: ${key}`);
    const tx = await vaultContract.unlock(key);
    console.log('🔄 Transaction submitted. Hash:', tx.hash);
    await tx.wait();
    console.log('✅ Unlock transaction confirmed');
    
    const isLocked = await vaultContract.locked();
    return !isLocked;
  } catch (error) {
    console.error('❌ Error unlocking vault:', error.message);
    return false;
  }
}

async function completeVaultUnlocking() {
  try {
    console.log('\n🏁 Completing Vault Unlocking stage...');
    const tx = await contract.completeVaultUnlocking();
    console.log('🔄 Transaction submitted. Hash:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    console.log('🎉 Vault Unlocking stage completed successfully!');
  } catch (error) {
    console.error('❌ Error completing Vault Unlocking stage:', error.message);
  }
}

async function runPart3() {
  const address = await wallet.getAddress();
  console.log(`\n📛 Wallet Address: ${address}`);

  const currentStage = await getCurrentStage(address);
  if (currentStage !== 3) {
    console.error('❌ Not at Vault Unlocking stage. Current stage:', currentStage);
    process.exit(1);
  }

  const vaultAddress = await getVaultAddress(address);
  const vaultContract = new ethers.Contract(vaultAddress, vaultAbi, wallet);

  const isLocked = await vaultContract.locked();
  if (!isLocked) {
    console.log('🎉 Vault is already unlocked!');
    await completeVaultUnlocking();
    return;
  }

  const keyHex = await provider.getStorage(vaultAddress, 1);
  console.log(`🔑 Vault Key found: ${keyHex}`);

  const success = await tryUnlockVault(vaultContract, keyHex);
  if (success) {
    console.log('🎯 Successfully unlocked the vault!');
    await completeVaultUnlocking();
    return;
  } else {
    console.log('❌ Failed to unlock the vault with the key read from storage.');
  }
}

runPart3();
