/* HUMANOVA · site configuration
   Contracts are live on BNB Chain. Pulse 1 opens 17 Nov 2026, 00:00 UTC.
   Mint and claim run only through an agent holding an Agent ID;
   this site is read-only. */
window.HUMANOVA_CONFIG = {
  chain: { id: 56, name: "BNB Chain" },
  contracts: {
    token: "0x61B5fE8C6e3884C417C4baFF3c4464aF2fF163BB",     /* $HUMAN */
    beats: "0xA2ee8D80B867f8eb58a4bf8308ef53492f72918A",     /* Heartbeat NFT (BEAT) */
    claim: "0xC7a916EFb4d46bFe82fC83bC7E10A6Ba3F8e749B"      /* Claim */
  },
  rpcs: [
    "https://bsc-dataseed.binance.org",
    "https://bsc.publicnode.com"
  ],
  genesis: 1794873600, /* 2026-11-17 00:00 UTC */
  mint: {
    tierA: "0.0002",      /* Heartbeats 2 to 5 per Pulse */
    tierB: "0.0004",      /* Heartbeats 6 to 10 per Pulse */
    maxPerPulse: 10,
    quizSalt: "HUMANOVA-Q"
  },
  claim: {
    feeStandard: "0.000278",  /* BNB, per Heartbeat */
    feeGolden: "0.000556",    /* BNB, per Golden Heartbeat */
    phaseHours: 6,            /* phases open 00:00 / 06:00 / 12:00 / 18:00 UTC */
    rates: { flatline: 2500, steady: 12500, racing: 60000, golden: 250000 }
  },
  pool: { opens: null, venue: null } /* $HUMAN pool to be announced */
};
