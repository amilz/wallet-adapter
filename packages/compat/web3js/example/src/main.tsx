import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { Blockhash } from '@solana/web3.js';
import bs58 from 'bs58';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders, useWalletActions } from './App.js';
import { registerMockWallet } from './mock-wallet.js';

const ENDPOINT = 'http://127.0.0.1:8899';

// `?mock=1` registers the test suite's mock wallet so the page can be
// exercised without a wallet extension. It signs but holds no funds.
if (new URLSearchParams(location.search).has('mock')) {
    registerMockWallet();
}

function Demo() {
    const { signHelloWorld, signTransferToSelf } = useWalletActions();
    const { connection } = useConnection();
    const { connect, connected, connecting, disconnect, publicKey, select, wallet: selectedWallet, wallets } = useWallet();
    const [log, setLog] = useState<string[]>([]);

    // Selecting a wallet updates React state, so connect on the next render.
    useEffect(() => {
        if (selectedWallet && !connected && !connecting) {
            connect().catch((error: unknown) =>
                setLog((previous) => [...previous, `connect failed: ${error instanceof Error ? error.message : String(error)}`]),
            );
        }
    }, [selectedWallet, connected, connecting, connect]);

    const append = (line: string) => setLog((previous) => [...previous, line]);
    const run = (label: string, action: () => Promise<string>) => async () => {
        try {
            append(`${label}: ${await action()}`);
        } catch (error) {
            append(`${label} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const onSignMessage = run('signMessage("hello world")', async () => {
        const signature = await signHelloWorld();
        return `signature ${bs58.encode(signature)}`;
    });

    const onSignTransfer = run('sign 0.1 SOL transfer to self', async () => {
        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = await signTransferToSelf(blockhash as Blockhash);
        return `signature ${bs58.encode(transaction.signature!)}`;
    });

    const onSendTransfer = run('send 0.1 SOL transfer to self', async () => {
        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = await signTransferToSelf(blockhash as Blockhash);
        const signature = await connection.sendRawTransaction(await transaction.serialize());
        return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899`;
    });

    return (
        <main style={{ fontFamily: 'system-ui, sans-serif', margin: '2rem auto', maxWidth: '42rem' }}>
            <h1>wallet-adapter → web3.js v3 compat shim</h1>
            <p>
                This page runs <code>@solana/web3.js@3.0.0-rc.1</code>. The wallet signs through{' '}
                <code>useWalletAdapterKitSigner()</code> from <code>@solana/web3-compat-wallet-adapter</code>.
            </p>
            {connected ? (
                <section>
                    <p>
                        Connected: <code data-testid="address">{publicKey?.toBase58()}</code> ({selectedWallet?.adapter.name})
                    </p>
                    <p style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={onSignMessage}>Sign “hello world”</button>
                        <button onClick={onSignTransfer}>Sign 0.1 SOL to self</button>
                        <button onClick={onSendTransfer}>Send 0.1 SOL to self</button>
                        <button onClick={() => disconnect()}>Disconnect</button>
                    </p>
                </section>
            ) : (
                <section>
                    <p>Connect a wallet:</p>
                    {wallets.length === 0 ? (
                        <p>
                            No wallet-standard wallets found. Install a wallet extension, or open this page with{' '}
                            <a href="?mock=1">?mock=1</a> to use a mock wallet.
                        </p>
                    ) : (
                        <p style={{ display: 'flex', gap: '0.5rem' }}>
                            {wallets.map(({ adapter }) => (
                                <button key={adapter.name} onClick={() => select(adapter.name)}>
                                    Connect {adapter.name}
                                </button>
                            ))}
                        </p>
                    )}
                </section>
            )}
            <pre data-testid="log" style={{ background: '#f4f4f4', minHeight: '6rem', padding: '1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {log.join('\n')}
            </pre>
        </main>
    );
}

createRoot(document.getElementById('root')!).render(
    <AppProviders endpoint={ENDPOINT}>
        <Demo />
    </AppProviders>,
);
