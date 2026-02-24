import { ESCROW_ADDRESS } from "@0xdirectping/sdk";
import type { Skill } from "./types.js";

export const scriptGeneratorSkill: Skill = {
  name: "script-generator",
  keywords: [
    "python",
    "script",
    "monitor",
    "events",
    "questcreated",
    "telegram",
  ],

  async execute(): Promise<string> {
    console.log("[script-generator] Generating Python monitoring script...");

    const script = `#!/usr/bin/env python3
"""
Quest Monitor — watches for QuestCreated events on 0xdirectping (Base)
and sends Telegram notifications.

Setup:
  pip install web3 requests

Usage:
  export TELEGRAM_BOT_TOKEN="your_bot_token"
  export TELEGRAM_CHAT_ID="your_chat_id"
  python quest_monitor.py

To get a Telegram bot token:
  1. Message @BotFather on Telegram
  2. Send /newbot and follow the prompts
  3. Copy the token

To get your chat ID:
  1. Message your bot
  2. Visit https://api.telegram.org/bot<TOKEN>/getUpdates
  3. Find the chat.id field
"""

import os
import time
import json
import requests
from web3 import Web3

# ── Config ──────────────────────────────────────────────────────────

BASE_RPC_URL = "https://mainnet.base.org"
CONTRACT_ADDRESS = "${ESCROW_ADDRESS}"
POLL_INTERVAL = 15  # seconds

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# QuestCreated event signature
QUEST_CREATED_TOPIC = Web3.keccak(
    text="QuestCreated(uint256,address,uint256,string,uint256,address)"
).hex()

# Minimal ABI for decoding QuestCreated events
CONTRACT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "questId", "type": "uint256"},
            {"indexed": True, "name": "creator", "type": "address"},
            {"indexed": False, "name": "amount", "type": "uint256"},
            {"indexed": False, "name": "description", "type": "string"},
            {"indexed": False, "name": "deadline", "type": "uint256"},
            {"indexed": False, "name": "token", "type": "address"},
        ],
        "name": "QuestCreated",
        "type": "event",
    }
]

# ── Telegram ────────────────────────────────────────────────────────

def send_telegram(message: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print(f"[telegram disabled] {message}")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "Markdown",
    }

    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        return True
    except Exception as e:
        print(f"[telegram error] {e}")
        return False

# ── Monitor ─────────────────────────────────────────────────────────

def main():
    w3 = Web3(Web3.HTTPProvider(BASE_RPC_URL))
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=CONTRACT_ABI,
    )

    print(f"Monitoring QuestCreated events on {CONTRACT_ADDRESS}")
    print(f"RPC: {BASE_RPC_URL}")
    print(f"Telegram: {'enabled' if TELEGRAM_BOT_TOKEN else 'disabled'}")
    print()

    last_block = w3.eth.block_number

    while True:
        try:
            current_block = w3.eth.block_number

            if current_block > last_block:
                # Fetch QuestCreated events
                events = contract.events.QuestCreated().get_logs(
                    fromBlock=last_block + 1,
                    toBlock=current_block,
                )

                for event in events:
                    quest_id = event.args.questId
                    creator = event.args.creator
                    amount_eth = Web3.from_wei(event.args.amount, "ether")
                    description = event.args.description[:100]
                    token = event.args.token

                    is_eth = token == "0x" + "0" * 40
                    token_label = "ETH" if is_eth else "USDC"

                    msg = (
                        f"*New Quest #{quest_id}*\\n"
                        f"Creator: \`{creator[:10]}...{creator[-4:]}\`\\n"
                        f"Amount: {amount_eth} {token_label}\\n"
                        f"Description: {description}"
                    )

                    print(f"[quest #{quest_id}] {amount_eth} {token_label} — {description}")
                    send_telegram(msg)

                last_block = current_block

        except Exception as e:
            print(f"[error] {e}")

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
`;

    const lines = [
      "# Python Quest Monitor Script",
      "",
      "Below is a complete Python script that monitors `QuestCreated` events on the 0xdirectping contract (Base mainnet) and sends Telegram notifications.",
      "",
      "## Setup",
      "",
      "```bash",
      "pip install web3 requests",
      "```",
      "",
      "## Environment Variables",
      "",
      "```bash",
      'export TELEGRAM_BOT_TOKEN="your_bot_token"',
      'export TELEGRAM_CHAT_ID="your_chat_id"',
      "```",
      "",
      "## Script",
      "",
      "```python",
      script.trim(),
      "```",
      "",
      "## How It Works",
      "",
      "1. Connects to Base mainnet via public RPC",
      `2. Polls for \`QuestCreated\` events on contract \`${ESCROW_ADDRESS}\``,
      "3. For each new quest, formats a message with quest ID, creator, amount, and description",
      "4. Sends to Telegram via Bot API (or prints to console if no token set)",
      "5. Runs continuously with 15-second polling interval",
      "",
      "---",
      "*Script generated by @scout-alpha via 0xdirectping.com*",
    ];

    return lines.join("\n");
  },
};
