import { type SignatureBytes, verifySignature } from '@solana/kit';
import {
    type Adapter,
    WalletAccountError,
    WalletNotConnectedError,
    WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import { createSignerFromWalletAdapter } from '../signer.js';
import { createMockAdapter, createMockWallet, createTestTransaction } from './helpers.js';

describe('createSignerFromWalletAdapter', () => {
    it('throws WalletNotConnectedError when the adapter is not connected', () => {
        expect(() =>
            createSignerFromWalletAdapter({ name: 'Mock Wallet', publicKey: null } as unknown as Adapter)
        ).toThrow(WalletNotConnectedError);
    });

    it('exposes the adapter public key as the signer address', async () => {
        const { wallet, address } = await createMockWallet();
        const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));
        expect(signer.address).toBe(address);
    });

    describe('signTransactions', () => {
        it('returns a valid signature for the signer address', async () => {
            const { wallet, address, keyPair } = await createMockWallet();
            const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));
            const transaction = createTestTransaction(address);

            const [dictionary] = await signer.signTransactions([transaction]);

            const signature = dictionary[address];
            expect(signature).toHaveLength(64);
            expect(await verifySignature(keyPair.publicKey, signature, transaction.messageBytes)).toBe(true);
        });

        it('signs a batch of transactions in a single wallet request', async () => {
            const { wallet, address, signTransaction } = await createMockWallet();
            const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));
            const transaction = createTestTransaction(address);

            const dictionaries = await signer.signTransactions([transaction, transaction]);

            expect(dictionaries).toHaveLength(2);
            expect(signTransaction).toHaveBeenCalledTimes(1);
            expect(signTransaction.mock.calls[0]).toHaveLength(2);
        });

        it('passes the configured chain and the wallet account to the wallet', async () => {
            const { wallet, address, signTransaction } = await createMockWallet();
            const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address), {
                chain: 'solana:mainnet',
            });
            await signer.signTransactions([createTestTransaction(address)]);

            const [input] = signTransaction.mock.calls[0];
            expect(input.chain).toBe('solana:mainnet');
            expect(input.account.address).toBe(address);
        });

        it('throws when the wallet modifies the transaction message', async () => {
            const { wallet, address } = await createMockWallet({ mutateMessage: true });
            const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));

            await expect(signer.signTransactions([createTestTransaction(address)])).rejects.toThrow(
                WalletSignTransactionError
            );
        });

        it('returns no dictionaries for an empty batch without calling the wallet', async () => {
            const { wallet, address, signTransaction } = await createMockWallet();
            const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));

            await expect(signer.signTransactions([])).resolves.toEqual([]);
            expect(signTransaction).not.toHaveBeenCalled();
        });
    });

    describe('modifyAndSignTransactions', () => {
        it('returns the signed transaction with its lifetime constraint preserved', async () => {
            const { wallet, address, keyPair } = await createMockWallet();
            const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));
            const transaction = createTestTransaction(address);

            const [signed] = await signer.modifyAndSignTransactions([transaction]);

            expect(signed.lifetimeConstraint).toEqual(transaction.lifetimeConstraint);
            expect(signed.messageBytes).toEqual(transaction.messageBytes);
            const signature = signed.signatures[address] as SignatureBytes;
            expect(await verifySignature(keyPair.publicKey, signature, signed.messageBytes)).toBe(true);
        });

        it('returns the modified transaction when the wallet modifies it', async () => {
            const { wallet, address } = await createMockWallet({ mutateMessage: true });
            const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));
            const transaction = createTestTransaction(address);

            const [signed] = await signer.modifyAndSignTransactions([transaction]);

            expect(signed.messageBytes).not.toEqual(transaction.messageBytes);
            expect(signed.signatures[address]).toHaveLength(64);
        });
    });

    describe('signMessages', () => {
        it('signs transaction message bytes identically to signTransactions', async () => {
            const { wallet, address } = await createMockWallet();
            const signer = createSignerFromWalletAdapter(createMockAdapter(wallet, address));
            const transaction = createTestTransaction(address);

            const [fromMessages] = await signer.signMessages([
                { content: new Uint8Array(transaction.messageBytes), signatures: {} },
            ]);
            const [fromTransactions] = await signer.signTransactions([transaction]);

            expect(fromMessages[address]).toEqual(fromTransactions[address]);
        });
    });

    describe('unsupported wallets', () => {
        it('rejects signing through an adapter that is not wallet-standard', async () => {
            const adapter = {
                name: 'Legacy Wallet',
                publicKey: { toBase58: () => '11111111111111111111111111111111' },
            } as unknown as Adapter;
            const signer = createSignerFromWalletAdapter(adapter);

            await expect(signer.signTransactions([createTestTransaction(signer.address)])).rejects.toThrow(
                WalletSignTransactionError
            );
        });

        it('rejects signing through a wallet without the solana:signTransaction feature', async () => {
            const { wallet, address } = await createMockWallet();
            const signAndSendOnlyWallet = {
                ...wallet,
                features: { 'solana:signAndSendTransaction': {} },
            };
            const signer = createSignerFromWalletAdapter(createMockAdapter(signAndSendOnlyWallet, address));

            await expect(signer.signTransactions([createTestTransaction(address)])).rejects.toThrow(
                /solana:signTransaction/
            );
        });

        it('rejects signing when the wallet has no account for the signer address', async () => {
            const { wallet, address } = await createMockWallet();
            const walletWithoutAccounts = { ...wallet, accounts: [] };
            const signer = createSignerFromWalletAdapter(createMockAdapter(walletWithoutAccounts, address));

            await expect(signer.signTransactions([createTestTransaction(address)])).rejects.toThrow(WalletAccountError);
        });
    });
});
