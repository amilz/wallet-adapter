import type { WalletName } from '@solana/wallet-adapter-base';
import { act, renderHook, waitFor } from '@testing-library/react';
import nacl from 'tweetnacl';
import { describe, expect, it } from 'vitest';

import { AppProviders, useWalletActions } from '../App';
import { mockWalletAddress, mockWalletPublicKeyBytes, registerMockWallet } from '../mock-wallet';

registerMockWallet();

async function renderConnectedWallet() {
    const rendered = renderHook(() => useWalletActions(), { wrapper: AppProviders });
    await waitFor(() => {
        expect(rendered.result.current.wallet.wallets.some(({ adapter }) => adapter.name === 'Mock Wallet')).toBe(
            true,
        );
    });
    // Selecting a wallet is a React state update, so it must flush before
    // connect() can see the selected adapter — just like a user picking a
    // wallet from a modal and then clicking "Connect" on a later render.
    act(() => {
        rendered.result.current.wallet.select('Mock Wallet' as WalletName);
    });
    await waitFor(() => {
        expect(rendered.result.current.wallet.wallet?.adapter.name).toBe('Mock Wallet');
    });
    await act(async () => {
        await rendered.result.current.connectTo('Mock Wallet');
    });
    await waitFor(() => {
        expect(rendered.result.current.wallet.connected).toBe(true);
    });
    return rendered;
}

describe('wallet-adapter example app', () => {
    it('connects to the wallet', async () => {
        const { result } = await renderConnectedWallet();
        expect(result.current.wallet.publicKey?.toBase58()).toBe(mockWalletAddress);
    });

    it('signs a hello world message', async () => {
        const { result } = await renderConnectedWallet();
        let signature!: Uint8Array;
        await act(async () => {
            signature = await result.current.signHelloWorld();
        });
        const message = new TextEncoder().encode('hello world');
        expect(nacl.sign.detached.verify(message, signature, mockWalletPublicKeyBytes)).toBe(true);
    });

    it('signs a 0.1 SOL transfer to self', async () => {
        const { result } = await renderConnectedWallet();
        let signedTransaction!: Awaited<ReturnType<typeof result.current.signTransferToSelf>>;
        await act(async () => {
            signedTransaction = await result.current.signTransferToSelf();
        });
        expect(signedTransaction.signature).not.toBeNull();
        expect(
            nacl.sign.detached.verify(
                signedTransaction.serializeMessage(),
                signedTransaction.signature!,
                mockWalletPublicKeyBytes,
            ),
        ).toBe(true);
        expect(signedTransaction.verifySignatures()).toBe(true);
    });
});
