import { Button } from '@mui/material';
import { NonceContainer } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { TransactionSignature } from '@solana/web3.js';
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import type { FC } from 'react';
import React, { useCallback } from 'react';
import { useNotify } from './notify';

export const SendLegacyTransaction: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, wallet } = useWallet();
    const notify = useNotify();
    const supportedTransactionVersions = wallet?.adapter.supportedTransactionVersions;

    const onClick = useCallback(async () => {
        const summary = [];
        let skipped = 0;
        const numTries = 10;
        for (let i = 0; i < numTries; i++) {
            const startTime = performance.now(); // record start time            
            let signature: TransactionSignature | undefined = undefined;
            try {
                if (!publicKey) throw new Error('Wallet not connected!');
                if (!supportedTransactionVersions) throw new Error("Wallet doesn't support versioned transactions!");
                if (!supportedTransactionVersions.has('legacy'))
                    throw new Error("Wallet doesn't support legacy transactions!");

                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight },
                } = await connection.getLatestBlockhashAndContext();

                const message = new TransactionMessage({
                    payerKey: publicKey,
                    recentBlockhash: blockhash,
                    instructions: [
                        {
                            data: Buffer.from('Hello, from the Solana Wallet Adapter example app!'),
                            keys: [],
                            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
                        },
                    ],
                });
                const transaction = new VersionedTransaction(message.compileToLegacyMessage());

                signature = await sendTransaction(transaction, connection, { minContextSlot });
                notify('info', 'Transaction sent:', signature);

                await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
                notify('success', 'Transaction successful!', signature);
                const endTime = performance.now(); // record end time
                const duration = endTime - startTime; // calculate duration
                console.log(`Transaction ${i + 1} completed in ${duration}ms`);
                summary.push(duration);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } catch (error: any) {
                skipped++;
                notify('error', `Transaction failed! ${error?.message}`, signature);
            }  finally {
                if (i === numTries - 1) {
                    console.log('Blockhash Summary: ', summary);
                    const avg = summary.reduce((a, b) => a + b, 0) / summary.length;
                    console.log('Blockhash Average: ', avg);
                    console.log('Skipped: ', skipped);
                }
            }
        }
    }, [publicKey, supportedTransactionVersions, connection, sendTransaction, notify]);

    return (
        <Button
            variant="contained"
            color="secondary"
            onClick={onClick}
            disabled={!publicKey || !supportedTransactionVersions?.has('legacy')}
        >
            Send 10 Legacy Transaction (devnet)
        </Button>
    );
};
