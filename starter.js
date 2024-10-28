//part1
import dotenv from 'dotenv';
import abi from './abi.js';
import { ethers } from 'ethers';

dotenv.config();


//BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
//PRIVATE_KEY is your private key to your wallet
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!BASE_SEPOLIA_RPC_URL || !PRIVATE_KEY) {
  console.error('❌ Please set BASE_SEPOLIA_RPC_URL and PRIVATE_KEY in your .env file');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC_URL);

async function checkProvider() {
  try {
    const network = await provider.getNetwork();
    console.log('🌐 Connected to network:', network.name, 'Chain ID:', network.chainId.toString());

    if (network.name !== 'base-sepolia') {
      console.warn('⚠️ Warning: You are not connected to the Base Sepolia network.');
    } else {
      console.log('✅ Successfully connected to Base Sepolia network.');
    }
  } catch (error) {
    console.error('❌ Provider connection failed:', error);
    process.exit(1);
  }
}

async function printEthBalance(address) {
  try {
    const balanceWei = await provider.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);
    console.log(`💰 Balance of ${address}: ${balanceEth} SepoliaETH`);
  } catch (error) {
    console.error(`❌ Error fetching balance for ${address}:`, error);
  }
}

await checkProvider();

let wallet;
try {
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log('🔑 Wallet initialized.');
} catch (error) {
  console.error('❌ Failed to initialize wallet:', error);
  process.exit(1);
}

async function getWalletAddressAndBalance() {
  try {
    const address = await wallet.getAddress();
    console.log(`📛 Wallet Address: ${address}`);

    await printEthBalance(address);
    return address;
  } catch (error) {
    console.error('❌ Failed to get wallet address or balance:', error);
    process.exit(1);
  }
}

const participantAddress = await getWalletAddressAndBalance();

const contractAddress = '0x09d21d696498b1e7d80e462f0d188bd6b984a964';

let contract;
try {
  contract = new ethers.Contract(contractAddress, abi, wallet);
  console.log('📄 Contract instantiated at:', contract.target);
} catch (error) {
  console.error('❌ Failed to instantiate contract:', error);
  process.exit(1);
}

async function getCrypticPuzzleHash() {
  try {
    const hash = await contract.CRYPTIC_PUZZLE_HASH();
    console.log('🔐 CRYPTIC_PUZZLE_HASH:', hash);
    return hash;
  } catch (error) {
    console.error('❌ Error fetching CRYPTIC_PUZZLE_HASH:', error);
  }
}

async function getExternalContract() {
  try {
    const external = await contract.EXTERNAL_CONTRACT();
    console.log('🔗 EXTERNAL_CONTRACT:', external);
    return external;
  } catch (error) {
    console.error('❌ Error fetching EXTERNAL_CONTRACT:', error);
  }
}

const crypticPuzzleHash = await getCrypticPuzzleHash();
const externalContractAddress = await getExternalContract();

async function startChallenge() {
  try {
    console.log('🚀 Starting the challenge...');
    const tx = await contract.startChallenge();
    console.log('🔄 Transaction submitted. Hash:', tx.hash);
    await tx.wait();
    console.log('✅ Challenge started successfully.');
  } catch (error) {
    console.error('❌ Error starting challenge:', error);
  }
}

async function completeCrypticPuzzle(solution, password) {
  try {
    console.log('🧩 Completing the Cryptic Puzzle stage...');
    const tx = await contract.completeCrypticPuzzle(solution, password);
    console.log('🔄 Transaction submitted. Hash:', tx.hash);
    await tx.wait();
    console.log('✅ Cryptic Puzzle stage completed successfully.');
  } catch (error) {
    console.error('❌ Error completing Cryptic Puzzle:', error);
  }
}

async function executePart1() {
  await startChallenge();

  console.log('⏳ Waiting for 5 seconds to ensure vault creation...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const solution = "XXXXXXXXXXXXXXXX";
  const password = participantAddress; 

  await completeCrypticPuzzle(solution, password);
}

async function getCurrentStage(participantAddress) {
  try {
    const stage = await contract.getCurrentStage(participantAddress);
    const stages = ["NotStarted", "CrypticPuzzle", "ExternalChallenge", "VaultUnlocking", "Completed"];
    console.log(`📈 Current Stage for ${participantAddress}: ${stages[stage] || "Unknown Stage"} (Stage ${stage})`);
  } catch (error) {
    console.error('❌ Error fetching current stage:', error);
  }
}

async function run() {
  await executePart1();

  await getCurrentStage(participantAddress);
}

run();
