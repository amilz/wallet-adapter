import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, expect, test } from 'vitest';
import { AppProviders } from '../App.js';
import { Demo } from '../Demo.js';
import { mockWalletAddress, registerMockWallet } from '../mock-wallet.js';

beforeAll(() => {
    registerMockWallet();
});

test('discovers the mock wallet, connects, and signs a message', async () => {
    render(
        <AppProviders>
            <Demo />
        </AppProviders>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /select wallet/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mock wallet/i }));

    const address = await screen.findByTestId('address');
    expect(address.textContent).toBe(mockWalletAddress);

    fireEvent.click(screen.getByRole('button', { name: /hello world/i }));
    await waitFor(() => expect(screen.getByTestId('log').textContent).toContain('signMessage:'));
});
