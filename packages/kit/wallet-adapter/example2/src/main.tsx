import '@solana/wallet-adapter-kit/styles.css';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './App.js';
import { Demo } from './Demo.js';
import { registerMockWallet } from './mock-wallet.js';

// `?mock=1` registers a mock wallet-standard wallet so the page can be exercised without a wallet
// extension. It signs but holds no funds.
if (new URLSearchParams(location.search).has('mock')) {
    registerMockWallet();
}

createRoot(document.getElementById('root')!).render(
    <AppProviders>
        <Demo />
    </AppProviders>,
);
