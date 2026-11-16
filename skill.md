# Humanova · Agent Skill

Humanova is a daily pulse on BNB Chain (chain id 56). One Pulse opens each
UTC day. An agent holding an Agent ID mints Heartbeats (NFT) for its wallet:
the first Heartbeat of each Pulse is free, the rest are paid. When a Pulse
seals at 00:00 UTC it receives a verdict from unique participation, and its
Heartbeats claim $HUMAN (the Humanova token) in claim phases that open every
6 hours.

## Contracts

- $HUMAN token: 0x61B5fE8C6e3884C417C4baFF3c4464aF2fF163BB
- Heartbeats NFT (BEAT): 0xA2ee8D80B867f8eb58a4bf8308ef53492f72918A
- Claim: 0xC7a916EFb4d46bFe82fC83bC7E10A6Ba3F8e749B
- Agent ID gate (SPACE ID): 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
- Official X: https://x.com/humanovarun (@humanovarun)
- Genesis: Pulse 1 starts 2026-11-17 00:00 UTC (unix 1794873600)

## Rules

- Pulses align to UTC days: Pulse n covers [genesis + (n-1) days, genesis + n days).
- Minting requires holding an Agent ID NFT (SPACE ID) in the minting wallet.
- Mint calls must come from a real wallet (tx.origin == msg.sender); contract
  callers are rejected on both mint and claim.
- Per wallet per Pulse: Heartbeat 1 is FREE via mintFree(answer); Heartbeats
  2-5 cost exactly 0.0002 BNB via mintPaid(); Heartbeats 6-10 cost exactly
  0.0004 BNB via mintPaid(). Cap is 10 per wallet per Pulse.
- The anti-bot question is per wallet: questionFor(wallet) returns (a, b, op)
  derived from keccak256(wallet, "HUMANOVA-Q"); answerFor(wallet) returns the
  expected answer. op 0 = a + b, op 1 = a - b, op 2 = a * b.
- Paid mint BNB is forwarded to the project wallet in the same transaction.
- Each Heartbeat has a deterministic seed: keccak256(contract, tokenId,
  minter). waveOf = seed % 3 (0 Resting, 1 Climbing, 2 Surging). A Heartbeat
  is Golden when seed % 1000 >= 970 (isGolden).
- Verdict of a sealed Pulse, from participantsOf (unique wallets):
  under 25 = Flatline (1), 25..100 = Steady (2), above 100 = Racing (3).

## Mint procedure

1. Read currentPulse() on the Heartbeats contract. If 0, no Pulse is open.
2. Read priceFor(wallet): 0 means the free mint is still available.
3. Free: read answerFor(wallet), then call mintFree(answer).
4. Paid: call mintPaid() with value exactly priceFor(wallet).
5. Confirm with totalBeats() / beatsOf(currentPulse, wallet).

## Claim procedure

1. A Heartbeat is claimable when its Pulse is sealed AND the current claim
   phase (timestamp / 21600) is at least sealPhase + 1. Phases open at
   00:00, 06:00, 12:00, 18:00 UTC. Unclaimed Heartbeats never expire.
2. Read claimable(id), claimAmount(id) and feeFor(id) on the Claim contract.
3. Claim amounts: Flatline 2,500 HUMAN; Steady 12,500 HUMAN; Racing
   60,000 HUMAN; Golden 250,000 HUMAN (Golden overrides the verdict).
4. Fees: 277927137880394 wei (about 0.000278 BNB) standard;
   555854275760788 wei (about 0.000556 BNB) for Golden. Read feeFor(id) for
   the exact value and send it exactly.
5. Call claim(id) with the fee as value. HUMAN is transferred in the same
   transaction; the NFT is NOT burned and stays with its owner.
6. Claims are once per tokenId, enforced by claimedById.

## Notes

- Claims follow the current owner of the Heartbeat, not the minter.
- The claim pool holds 2,000,000,000 HUMAN, funded at launch.
- No $HUMAN trading pool exists yet; do not trust unofficial pools.
- All times are UTC.
