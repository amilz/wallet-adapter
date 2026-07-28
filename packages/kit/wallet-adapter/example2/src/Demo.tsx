import { WalletMultiButton, useWallet, useConnection } from '@solana/wallet-adapter-kit/web3js';
import { SystemProgram, Transaction } from '@solana/web3.js';
import { useState } from 'react';


export function Demo() {
    const { connected, publicKey, signMessage, signer, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const [log, setLog] = useState<string[]>([]);
    const append = (line: string) => setLog((previous) => [...previous, line]);

    const onSignMessage = async () => {
        try {
            const signature = await signMessage(new TextEncoder().encode('hello from @solana/web3.js v3'));
            append(`signMessage bytes: ${(signature.toString())}`);
        } catch (error) {
            append(`signMessage failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const onSignTransaction = async () => {
        if (!publicKey || !sendTransaction) return;
        try {
            const transaction = new Transaction();
            transaction.feePayer = publicKey;
            transaction.add(
                SystemProgram.transfer({ fromPubkey: publicKey, lamports: 1_000_000n, toPubkey: publicKey })
            );
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const txId = await sendTransaction(transaction, connection);

            append(`transaction id: ${txId}`);
        } catch (error) {
            append(`signTransaction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return (
        <main style={{ fontFamily: 'system-ui, sans-serif', margin: '2rem auto', maxWidth: '42rem' }}>
            <h1>@solana/wallet-adapter-kit + @solana/web3.js v3</h1>
            <p>
                The Kit wallet adapter driving a <code>@solana/web3.js</code> v3 app: connect below, then build and
                sign a transfer with the classic <code>web3.js</code> API.
            </p>
            <WalletMultiButton />
            {connected && publicKey ? (
                <section style={{ marginTop: '1rem' }}>
                    <p>
                        web3.js Address: <code data-testid="address">{publicKey.toBase58()}</code>
                    </p>
                    <p>
                        Signer: <code>{signer ? signer.address : 'none'}</code>
                    </p>
                    <button onClick={onSignMessage}>Sign message</button>{' '}
                    <button onClick={onSignTransaction}>Sign transaction</button>
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
