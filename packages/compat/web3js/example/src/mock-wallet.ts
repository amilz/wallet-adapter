/**
 * A minimal wallet-standard wallet backed by a fixed in-memory ed25519 keypair.
 *
 * This file is intentionally web3.js-agnostic: it works directly on raw bytes
 * (wire-format transactions and message payloads) so it can serve as the
 * "browser wallet" regardless of which Solana client library the app uses.
 */
import { registerWallet } from '@wallet-standard/wallet';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

const keypair = nacl.sign.keyPair();

export const mockWalletPublicKeyBytes: Uint8Array = keypair.publicKey;
export const mockWalletAddress: string = bs58.encode(keypair.publicKey);

const CHAINS = ['solana:localnet'] as const;

const ICON =
    'data:image/svg+xml;base64,' +
    btoa('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#9945FF"/></svg>');

const account = {
    address: mockWalletAddress,
    publicKey: keypair.publicKey,
    chains: CHAINS,
    features: ['solana:signMessage', 'solana:signTransaction'] as const,
};

/**
 * Signs a serialized wire transaction without any web3.js dependency.
 *
 * Wire format: shortvec signature count (single byte here, since N < 128),
 * followed by N x 64-byte signatures, followed by the message bytes. Assumes
 * the mock wallet is the fee payer (first signer), so its signature is
 * written into slot 0.
 */
function signWireTransaction(transaction: Uint8Array): Uint8Array {
    const numSignatures = transaction[0];
    const messageOffset = 1 + numSignatures * 64;
    const message = transaction.slice(messageOffset);
    const signature = nacl.sign.detached(message, keypair.secretKey);
    const signed = new Uint8Array(transaction);
    signed.set(signature, 1);
    return signed;
}

// Real wallets expose no accounts until the user approves a connection, and
// `StandardWalletAdapter` relies on this: when accounts are pre-populated it
// connects (and emits `connect`) synchronously, before React effects higher up
// the tree have subscribed, so the connection is silently dropped.
let connectedAccounts: (typeof account)[] = [];

export const mockWallet = {
    version: '1.0.0' as const,
    name: 'Mock Wallet',
    icon: ICON as `data:image/svg+xml;base64,${string}`,
    chains: CHAINS,
    get accounts() {
        return connectedAccounts;
    },
    features: {
        'standard:connect': {
            version: '1.0.0' as const,
            connect: async () => {
                connectedAccounts = [account];
                return { accounts: connectedAccounts };
            },
        },
        'standard:events': {
            version: '1.0.0' as const,
            on: (_event: string, _listener: (...args: unknown[]) => void) => () => {},
        },
        'solana:signMessage': {
            version: '1.0.0' as const,
            signMessage: async (...inputs: readonly { message: Uint8Array }[]) =>
                inputs.map(({ message }) => ({
                    signedMessage: message,
                    signature: nacl.sign.detached(message, keypair.secretKey),
                })),
        },
        'solana:signTransaction': {
            version: '1.0.0' as const,
            supportedTransactionVersions: ['legacy', 0] as const,
            signTransaction: async (...inputs: readonly { transaction: Uint8Array }[]) =>
                inputs.map(({ transaction }) => ({
                    signedTransaction: signWireTransaction(transaction),
                })),
        },
    },
};

export function registerMockWallet(): void {
    registerWallet(mockWallet);
}
