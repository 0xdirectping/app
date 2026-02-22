import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { readFileSync } from "fs";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
if (!PRIVATE_KEY) {
  console.error("Set DEPLOYER_PRIVATE_KEY env var");
  process.exit(1);
}

const useMainnet = process.argv.includes("--mainnet");
const chain = useMainnet ? base : baseSepolia;
const rpc = useMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org";

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(rpc),
});
const publicClient = createPublicClient({
  chain,
  transport: http(rpc),
});

async function main() {
  const contractName = process.argv[2] === "--v1" ? "SimpleEscrow" : "SimpleEscrowV2";
  const abiFile = `build/contracts_${contractName}_sol_${contractName}.abi`;
  const binFile = `build/contracts_${contractName}_sol_${contractName}.bin`;

  const abi = JSON.parse(readFileSync(abiFile, "utf8"));
  const bytecode = `0x${readFileSync(binFile, "utf8").trim()}` as `0x${string}`;

  console.log(`Deploying ${contractName} from:`, account.address);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", Number(balance) / 1e18, "ETH");

  if (balance === 0n) {
    console.error(`\nNo ETH! Fund this address on Base ${useMainnet ? "Mainnet" : "Sepolia"}:`);
    console.error(account.address);
    console.error("\nFaucets:");
    console.error("  https://www.alchemy.com/faucets/base-sepolia");
    console.error("  https://faucet.quicknode.com/base/sepolia");
    process.exit(1);
  }

  const hash = await walletClient.deployContract({ abi, bytecode });
  console.log("Deploy tx:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`\n${contractName} deployed to:`, receipt.contractAddress);
  console.log("\nAdd to .env.local:");
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${receipt.contractAddress}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
