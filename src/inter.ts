import Web3, { Bytes } from 'web3';
import fs from 'fs';
import { ethers } from 'ethers';

interface TransactionOptions {
  gasLimit?: string;
  gasPrice?: string;
}

interface SendMystOptions extends TransactionOptions {
  mystAddress: string;
  amount: number;
}

async function sendMystToWallet(
  walletAddress: string,
  privateKey: string,
  options: SendMystOptions,
  abiFilePath: string
): Promise<Bytes | null> {
  try {
            
        // Connect to provider (e.g. Infura, Alchemy, or localhost)
        const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com"); // replace with your chain RPC

        // Set up wallet (keep your private key secure!)
        const wallet = new ethers.Wallet(privateKey, provider);

        // Paste the full ABI you shared here (trimmed for clarity)
        
        const abi = JSON.parse(fs.readFileSync(abiFilePath, 'utf-8'));
        if (!Array.isArray(abi)) {
            throw new Error("ABI file doesn't contain a valid JSON array.");
        }
        const tokenAddress = "0x1379e8886a944d2d9d440b3d88df536aea08d9f3"; // replace with your contract address
        const contract = new ethers.Contract(tokenAddress, abi, wallet);


console.log(walletAddress)
        const [rawBalance, decimals, symbol] = await Promise.all([
            contract.balanceOf(walletAddress),
            contract.decimals(),
            contract.symbol(),
          ]);
          
        const formatted = ethers.formatUnits(rawBalance, decimals);
        console.log(`Token Balance: ${formatted} ${symbol}`);
        const recipient = options.mystAddress; // recipient address
        const amount = "1"; // amount as human-readable (e.g., 1.5 tokens)
        // Convert to correct units
        const parsedAmount = ethers.parseUnits(amount, decimals);

        // Send the transaction
        const tx = await contract.transfer(recipient, parsedAmount);
        console.log(`Tx sent: ${tx.hash}`);

        // Wait for confirmation
        const result = await tx.wait();
        console.log("Transfer confirmed!");
        return result

  } catch (error: any) {
    console.error('Error sending Myst:', error.message, error.stack);
    if (error.message.includes("Transaction has been reverted")) {
      console.error("Transaction reverted. Check contract function, amount, and gas.");
    } else if (error.code === -32603) {
      console.error("Invalid JSON RPC request");
    } else if (error.message.includes("insufficient funds")) {
      console.error("Insufficient funds.");
    } else {
      console.error("An unexpected error occurred.");
    }
    return null;
  }
}



// Example Usage (replace placeholders):
export async function startContract(mystAddress: string) {
  const walletAddress = '0x81399E92aCF86F5aeD2fc44872eaFb9115a79E68';
  const privateKey = '36ca358e5fe66e9e8bd6f92e3cfe9a57a31d9a7defd63021c17f66091f7b0716';
//   const mystAddress = '0xF7C9B4B261408982fD0b71593c6398832234a179'; // Correct address
  const abiFilePath = './proxyabi.json';
  const amount = 1;
  const gasLimit = '0x5208'; // Example gas limit (adjust!)
  const gasPrice = Web3.utils.toHex(Web3.utils.toWei('50', 'gwei')); // Example gas price (adjust!)

  try {
    const txHash = await sendMystToWallet(
      walletAddress,
      privateKey,
      { mystAddress, amount, gasLimit, gasPrice },
      abiFilePath
    );
    if (txHash) {
      console.log("Transaction sent successfully!");
      return true
    } else {
      console.error("Failed to send transaction.");
      return false
    }
  } catch (error) {
    console.error("Error during main execution:", error);
    return false
  }
}

