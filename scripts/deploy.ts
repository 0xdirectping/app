import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readFileSync } from "fs";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
if (!PRIVATE_KEY) {
  console.error("Set DEPLOYER_PRIVATE_KEY env var");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

async function main() {
  const abi = JSON.parse(readFileSync("build/contracts_SimpleEscrow_sol_SimpleEscrow.abi", "utf8"));
  const bytecode = `0x${readFileSync("build/contracts_SimpleEscrow_sol_SimpleEscrow.bin", "utf8").trim()}` as `0x${string}`;

  console.log("Deploying from:", account.address);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", Number(balance) / 1e18, "ETH");

  if (balance === 0n) {
    console.error("\nNo ETH! Fund this address on Base Sepolia:");
    console.error(account.address);
    console.error("\nFaucets:");
    console.error("  https://www.alchemy.com/faucets/base-sepolia");
    console.error("  https://faucet.quicknode.com/base/sepolia");
    process.exit(1);
  }

  const hash = await walletClient.deployContract({ abi, bytecode });
  console.log("Deploy tx:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("\nSimpleEscrow deployed to:", receipt.contractAddress);
  console.log("\nAdd to .env.local:");
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${receipt.contractAddress}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
