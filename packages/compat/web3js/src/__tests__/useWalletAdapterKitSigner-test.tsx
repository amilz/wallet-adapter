/**
 * @jest-environment jsdom
 */
import { address } from '@solana/addresses';
import { useWallet, type WalletContextState } from '@solana/wallet-adapter-react';
import { SolanaSignTransaction } from '@solana/wallet-standard-features';
import type { Wallet } from '@wallet-standard/base';
import { renderHook } from '@testing-library/react';
import { useWalletAdapterKitSigner } from '../useWalletAdapterKitSigner.js';
import { createMockAdapter } from './helpers.js';

jest.mock('@solana/wallet-adapter-react', () => ({
    useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

function mockWalletContext(state: Partial<WalletContextState>) {
    mockUseWallet.mockReturnValue({ publicKey: null, wallet: null, ...state } as WalletContextState);
}

const TEST_ADDRESS = address('GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi');

function createStubWallet(): Wallet {
    return {
        accounts: [{ address: TEST_ADDRESS, chains: ['solana:mainnet'], features: [SolanaSignTransaction] }],
        features: { [SolanaSignTransaction]: { signTransaction: jest.fn(), version: '1.0.0' } },
    } as unknown as Wallet;
}

describe('useWalletAdapterKitSigner', () => {
    it('returns a null signer while no wallet is connected', () => {
        mockWalletContext({});
        const { result } = renderHook(() => useWalletAdapterKitSigner());
        expect(result.current.signer).toBeNull();
    });

    it('returns a signer for the connected wallet', () => {
        const adapter = createMockAdapter(createStubWallet(), TEST_ADDRESS);
        mockWalletContext({
            publicKey: adapter.publicKey,
            wallet: { adapter, readyState: adapter.readyState },
        });

        const { result } = renderHook(() => useWalletAdapterKitSigner());

        expect(result.current.signer?.address).toBe(TEST_ADDRESS);
    });

    it('returns the same signer across re-renders', () => {
        const adapter = createMockAdapter(createStubWallet(), TEST_ADDRESS);
        mockWalletContext({
            publicKey: adapter.publicKey,
            wallet: { adapter, readyState: adapter.readyState },
        });

        const { rerender, result } = renderHook(() => useWalletAdapterKitSigner());
        const first = result.current.signer;
        rerender();

        expect(result.current.signer).toBe(first);
    });
});
