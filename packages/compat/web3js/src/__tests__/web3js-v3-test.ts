import { blockhash, type SignatureBytes, verifySignature } from '@solana/kit';
// The v3 release candidate is aliased as `web3js-v3` so that this monorepo's
// v1-based packages keep resolving `@solana/web3.js` to v1.
import { Address, SystemProgram, Transaction, TransactionMessage, VersionedTransaction } from 'web3js-v3';
import { createSignerFromWalletAdapter } from '../signer.js';
import { createMockAdapter, createMockWallet, TEST_BLOCKHASH } from './helpers.js';

describe('@solana/web3.js v3 interop', () => {
    it('signs a VersionedTransaction via VersionedTransaction#sign', async () => {
        const { wallet, address, keyPair } = await createMockWallet();
        const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));
        const payer = new Address(address);

        const message = new TransactionMessage({
            instructions: [SystemProgram.transfer({ fromPubkey: payer, lamports: 1, toPubkey: payer })],
            payerKey: payer,
            recentBlockhash: blockhash(TEST_BLOCKHASH),
        }).compileToV0Message();
        const transaction = new VersionedTransaction(message);

        await transaction.sign([signer]);

        const signature = transaction.signatures[0] as SignatureBytes;
        expect(signature).toHaveLength(64);
        expect(await verifySignature(keyPair.publicKey, signature, transaction.message.serialize())).toBe(true);
    });

    it('signs a legacy Transaction via Transaction#sign', async () => {
        const { wallet, address, keyPair } = await createMockWallet();
        const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));
        const payer = new Address(address);

        const transaction = new Transaction({
            blockhash: blockhash(TEST_BLOCKHASH),
            feePayer: payer,
            lastValidBlockHeight: 100,
        }).add(SystemProgram.transfer({ fromPubkey: payer, lamports: 1, toPubkey: payer }));

        await transaction.sign(signer);

        const signature = transaction.signature as SignatureBytes;
        expect(signature).toHaveLength(64);
        expect(await verifySignature(keyPair.publicKey, signature, transaction.serializeMessage())).toBe(true);
    });
});
