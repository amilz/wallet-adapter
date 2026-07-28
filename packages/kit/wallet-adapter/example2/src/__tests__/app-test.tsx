import { Surfnet } from '@solana/surfpool';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { AppProviders } from '../App.js';
import { Demo } from '../Demo.js';
import { mockWalletAddress, registerMockWallet } from '../mock-wallet.js';

let surfnet: Surfnet;

beforeAll(() => {
    surfnet = Surfnet.start();
    surfnet.fundSol(mockWalletAddress, 5_000_000_000);
    registerMockWallet();
}, 60_000);

afterAll(() => {
    surfnet.stop();
});

test('connects, exposes the address as a web3.js PublicKey, and signs a web3.js transaction', async () => {
    render(
        <AppProviders endpoint={surfnet.rpcUrl}>
            <Demo />
        </AppProviders>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /select wallet/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mock wallet/i }));

    const address = await screen.findByTestId('address');
    expect(address.textContent).toBe(mockWalletAddress);

    fireEvent.click(screen.getByRole('button', { name: /sign transaction/i }));
    await waitFor(() => expect(screen.getByTestId('log').textContent).toContain('transaction id:'), {
        timeout: 15_000,
    });
});
