//part2

import dotenv from 'dotenv';
import abi from './abi.js';
import { ethers } from 'ethers';

dotenv.config();

const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

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
const externalContractAddress = '0x874280bb7c9493338cbF9D3bC3a119DE7EbD8bf2';

let contract;
try {
  contract = new ethers.Contract(contractAddress, abi, wallet);
  console.log('📄 DevBounty Contract instantiated at:', contract.target);
} catch (error) {
  console.error('❌ Failed to instantiate DevBounty contract:', error);
  process.exit(1);
}

const externalAbi = [
  "function resetSolution(address participant) external",
  "function generateSolution(address participant) external",
  "function checkSolutionExists(address participant) external view returns (bool)",
  "function checkSolution(address participant, bytes32 solution) external view returns (bool)",
  "function getHint(address participant) external view returns (uint256)"
];

let externalContract;
try {
  externalContract = new ethers.Contract(externalContractAddress, externalAbi, wallet);
  console.log('🔗 External Contract instantiated at:', externalContract.target);
} catch (error) {
  console.error('❌ Failed to instantiate External Contract:', error);
  process.exit(1);
}

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

async function getExternalHint(participantAddress) {
  try {
    const hint = await externalContract.getHint(participantAddress);
    console.log(`💡 Hint from External Contract for ${participantAddress}: ${hint.toString()}`);
    return Number(hint);
  } catch (error) {
    console.error('❌ Error fetching external hint:', error);
    process.exit(1);
  }
}

function generatePossibleSolutions(address, hint) {
  const solutions = [];
  
  const direct = ethers.concat([
    ethers.toUtf8Bytes(hint.toString()),
    ethers.getBytes(address)
  ]);
  solutions.push(ethers.keccak256(direct));
  
  const combined1 = address + hint.toString();
  solutions.push(ethers.keccak256(ethers.toUtf8Bytes(combined1)));
  
  const combined2 = hint.toString() + address;
  solutions.push(ethers.keccak256(ethers.toUtf8Bytes(combined2)));
  
  const packed = ethers.solidityPacked(
    ['uint256', 'address'],
    [hint, address]
  );
  solutions.push(ethers.keccak256(packed));

  const hexHint = ethers.toBeHex(hint);
  const combined3 = hexHint + address.slice(2);
  solutions.push(ethers.keccak256(ethers.toUtf8Bytes(combined3)));

  const packed1 = ethers.solidityPacked(
    ['address', 'uint256'],
    [address, hint]
  );
  solutions.push(ethers.keccak256(packed1));
  
  const paddedHint = ethers.zeroPadValue(ethers.toBeHex(hint), 32);
  const packed2 = ethers.solidityPacked(
    ['bytes32', 'address'],
    [paddedHint, address]
  );
  solutions.push(ethers.keccak256(packed2));

  const addrLower = address.toLowerCase();
  const combined4 = `${hint}${addrLower}`;
  solutions.push(ethers.keccak256(ethers.toUtf8Bytes(combined4)));

  const addressBytes = ethers.getBytes(address);
  const hintBytes = ethers.toUtf8Bytes(hint.toString().padStart(64, '0'));
  solutions.push(ethers.keccak256(ethers.concat([hintBytes, addressBytes])));

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'address'],
    [hint, address]
  );
  solutions.push(ethers.keccak256(encoded));

  const paddedHintHex = ethers.toBeHex(hint).slice(2).padStart(64, '0');
  const addressHex = address.slice(2);
  solutions.push(`0x${paddedHintHex}${addressHex}`);

  const hexString = hint.toString(16);
  const packed3 = ethers.solidityPacked(
    ['bytes', 'address'],
    [ethers.toUtf8Bytes(hexString), address]
  );
  solutions.push(ethers.keccak256(packed3));

  const numberAsBytes32 = ethers.zeroPadValue(ethers.toBeHex(hint), 32);
  solutions.push(ethers.keccak256(numberAsBytes32));

  console.log('\n🔍 Generated Solutions:');
  solutions.forEach((sol, i) => {
    console.log(`Solution ${i + 1}:`, sol);
  });

  return solutions;
}

async function checkSolution(participantAddress, solution) {
  try {
    const isValid = await externalContract.checkSolution(participantAddress, solution);
    console.log(`\n📝 Testing solution: ${solution}`);
    console.log(`Result: ${isValid ? '✅ Valid!' : '❌ Invalid'}`);
    return isValid;
  } catch (error) {
    console.error('❌ Error checking solution:', error);
    return false;
  }
}

async function completeExternalChallenge(solution) {
  try {
    console.log('\n🔗 Attempting to complete External Challenge...');
    console.log('Using solution:', solution);
    
    if (!/^0x([A-Fa-f0-9]{64})$/.test(solution)) {
      console.error('❌ Invalid bytes32 format');
      return;
    }

    const tx = await contract.completeExternalChallenge(solution);
    console.log('🔄 Transaction submitted. Hash:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    console.log('✨ External Challenge completed successfully!');
  } catch (error) {
    console.error('❌ Error completing challenge:', error.message);
    if (error.error && error.error.data) {
      console.error('Contract error data:', error.error.data);
    }
  }
}
async function runPart2() {
  let address;
  try {
    address = await wallet.getAddress();
    console.log(`\n📛 Wallet Address: ${address}`);
  } catch (error) {
    console.error('❌ Failed to get wallet address:', error);
    process.exit(1);
  }

  const currentStage = await getCurrentStage(address);
  if (currentStage !== 2) {
    console.error('❌ Not at External Challenge stage. Current stage:', currentStage);
    process.exit(1);
  }

  const hint = await getExternalHint(address);
  const solutions = generatePossibleSolutions(address, hint);
  
  for (let i = 0; i < solutions.length; i++) {
    const solution = solutions[i];
    const isValid = await checkSolution(address, solution);
    
    if (isValid) {
      console.log('\n🎯 Valid solution found!');
      await completeExternalChallenge(solution);
      return;
    }
  }

  console.log('\n❌ No valid solution found among the generated possibilities.');
}

runPart2();
