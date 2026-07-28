import { WalletMultiButton, useWallet, useWalletSigner } from '@solana/wallet-adapter-kit';
import bs58 from 'bs58';
import { useState } from 'react';

export function Demo() {
    const { address, connected, signMessage } = useWallet();
    const signer = useWalletSigner();
    const [log, setLog] = useState<string[]>([]);
    const append = (line: string) => setLog((previous) => [...previous, line]);

    const onSignMessage = async () => {
        try {
            const signature = await signMessage(new TextEncoder().encode('hello world'));
            append(`signMessage: ${bs58.encode(signature as Uint8Array)}`);
        } catch (error) {
            append(`signMessage failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return (
        <main style={{ fontFamily: 'system-ui, sans-serif', margin: '2rem auto', maxWidth: '42rem' }}>
            <h1>@solana/wallet-adapter-kit</h1>
            <p>Wallet-adapter ergonomics on @solana/kit. Connect with the button below.</p>
            <WalletMultiButton />
            {connected ? (
                <section style={{ marginTop: '1rem' }}>
                    <p>
                        Connected: <code data-testid="address">{address}</code>
                    </p>
                    <p>
                        Signer: <code>{signer ? signer.address : 'none'}</code>
                    </p>
                    <button onClick={onSignMessage}>Sign “hello world”</button>
                </section>
            ) : null}
            <pre
                data-testid="log"
                style={{
                    background: '#f4f4f4',
                    marginTop: '1rem',
                    minHeight: '4rem',
                    padding: '1rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}
            >
                {log.join('\n')}
            </pre>
        </main>
    );
}
