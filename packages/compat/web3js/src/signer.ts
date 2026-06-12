import { address, type Address } from '@solana/addresses';
import { bytesEqual, type ReadonlyUint8Array } from '@solana/codecs-core';
import { getAbortablePromise } from '@solana/promises';
import type {
    MessagePartialSigner,
    SignatureDictionary,
    TransactionModifyingSigner,
    TransactionPartialSigner,
} from '@solana/signers';
import { getCompiledTransactionMessageDecoder } from '@solana/transaction-messages';
import {
    assertIsTransactionWithinSizeLimit,
    getTransactionCodec,
    getTransactionLifetimeConstraintFromCompiledTransactionMessage,
    type SignaturesMap,
    type Transaction,
    type TransactionMessageBytes,
    type TransactionWithLifetime,
} from '@solana/transactions';
import {
    type Adapter,
    type StandardWalletAdapter,
    WalletAccountError,
    WalletNotConnectedError,
    WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import {
    SolanaSignTransaction,
    type SolanaSignTransactionFeature,
    type SolanaSignTransactionInput,
    type SolanaSignTransactionMethod,
} from '@solana/wallet-standard-features';
import type { IdentifierString, WalletAccount } from '@wallet-standard/base';

export interface WalletAdapterSignerConfig {
    /** Chain to request signatures on, e.g. `'solana:mainnet'`. Passed through to the wallet. */
    chain?: IdentifierString;
}

const compiledTransactionMessageDecoder = getCompiledTransactionMessageDecoder();
const transactionCodec = getTransactionCodec();

type SignerMethodConfig = Readonly<{
    abortSignal?: AbortSignal;
    minContextSlot?: bigint;
}>;

/**
 * A Kit signer for **transactions only**, backed by a wallet-adapter wallet.
 *
 * It implements every signer interface that `@solana/web3.js` v3 signing APIs
 * (`Transaction#sign`, `VersionedTransaction#sign`, `Connection#sendTransaction`,
 * `sendAndConfirmTransaction`) dispatch on, so it can be passed anywhere those APIs
 * accept a signer. It also works with `@solana/kit` transaction signing functions.
 *
 * Every method, including `signMessages`, signs serialized *transactions* through the
 * wallet's `solana:signTransaction` feature — `signMessages` exists because web3.js v3
 * signs transactions through it when no transaction lifetime is available, and it treats
 * its input as transaction message bytes. Do not use this signer to sign arbitrary
 * off-chain messages; wallets will reject them.
 */
export type WalletAdapterTransactionSigner = MessagePartialSigner &
    TransactionModifyingSigner &
    TransactionPartialSigner;

/**
 * Create a Kit signer from a connected wallet-adapter adapter.
 *
 * Wallets surfaced through the wallet standard (`StandardWalletAdapter`) sign via their
 * `solana:signTransaction` feature, which operates on serialized transaction bytes — no
 * web3.js types cross the boundary, so this works regardless of which web3.js version
 * (if any) is installed.
 *
 * Adapters without an underlying wallet-standard wallet, and wallets that only support
 * `solana:signAndSendTransaction`, are not supported: the returned signer's methods
 * throw {@link WalletSignTransactionError} with an explanation.
 *
 * @throws {WalletNotConnectedError} if the adapter is not connected.
 */
export function createSignerFromWalletAdapter(
    adapter: Adapter,
    config: WalletAdapterSignerConfig = {}
): WalletAdapterTransactionSigner {
    const { publicKey } = adapter;
    if (!publicKey) throw new WalletNotConnectedError();
    const signerAddress = address(publicKey.toBase58());
    const { chain } = config;

    async function signViaWallet(
        wireTransactions: readonly Uint8Array[],
        config: SignerMethodConfig | undefined
    ): Promise<readonly Transaction[]> {
        const { abortSignal, minContextSlot } = config ?? {};
        abortSignal?.throwIfAborted();
        const signTransaction = getSignTransactionMethod(adapter);
        const account = getWalletAccount(adapter as StandardWalletAdapter, signerAddress);
        const inputs: SolanaSignTransactionInput[] = wireTransactions.map((transaction) => ({
            account,
            ...(chain ? { chain } : null),
            transaction,
            ...(minContextSlot != null ? { options: { minContextSlot: Number(minContextSlot) } } : null),
        }));
        const outputs = await getAbortablePromise(signTransaction(...inputs), abortSignal);
        return outputs.map(({ signedTransaction }) => transactionCodec.decode(signedTransaction));
    }

    function getSignatureDictionary(signedTransaction: Transaction): SignatureDictionary {
        const signature = signedTransaction.signatures[signerAddress];
        if (!signature) {
            throw new WalletSignTransactionError(
                `Wallet '${adapter.name}' did not return a signature for address ${signerAddress}.`
            );
        }
        return Object.freeze({ [signerAddress]: signature } as SignatureDictionary);
    }

    return Object.freeze({
        address: signerAddress,
        async modifyAndSignTransactions(transactions, config) {
            if (transactions.length === 0) return [];
            const wireTransactions = transactions.map(
                (transaction) => transactionCodec.encode(transaction) as Uint8Array
            );
            const signedTransactions = await signViaWallet(wireTransactions, config);
            // The wallet may have modified the message (e.g. swapped the blockhash), in which
            // case the input transaction's lifetime constraint no longer describes the signed
            // one: reuse it only while the message's lifetime token still matches it, and
            // otherwise derive a fresh constraint from the signed message itself.
            return await getAbortablePromise(
                Promise.all(
                    signedTransactions.map(async (signedTransaction, i) => {
                        assertIsTransactionWithinSizeLimit(signedTransaction);
                        const inputTransaction = transactions[i];
                        const existingLifetime =
                            'lifetimeConstraint' in inputTransaction
                                ? (inputTransaction as Transaction & TransactionWithLifetime).lifetimeConstraint
                                : undefined;
                        if (
                            existingLifetime &&
                            bytesEqual(signedTransaction.messageBytes, inputTransaction.messageBytes)
                        ) {
                            return Object.freeze({ ...signedTransaction, lifetimeConstraint: existingLifetime });
                        }
                        const compiledTransactionMessage = compiledTransactionMessageDecoder.decode(
                            signedTransaction.messageBytes
                        );
                        if (existingLifetime) {
                            const currentToken =
                                'blockhash' in existingLifetime ? existingLifetime.blockhash : existingLifetime.nonce;
                            if (compiledTransactionMessage.lifetimeToken === currentToken) {
                                return Object.freeze({ ...signedTransaction, lifetimeConstraint: existingLifetime });
                            }
                        }
                        const lifetimeConstraint =
                            await getTransactionLifetimeConstraintFromCompiledTransactionMessage(
                                compiledTransactionMessage
                            );
                        return Object.freeze({ ...signedTransaction, lifetimeConstraint });
                    })
                ),
                config?.abortSignal
            );
        },
        async signMessages(messages, config) {
            if (messages.length === 0) return [];
            const wireTransactions = messages.map(({ content }) => wireTransactionFromMessageBytes(content));
            const signedTransactions = await signViaWallet(wireTransactions, config);
            return signedTransactions.map((signedTransaction, i) => {
                assertMessageUnchanged(messages[i].content, signedTransaction.messageBytes, adapter.name);
                return getSignatureDictionary(signedTransaction);
            });
        },
        async signTransactions(transactions, config) {
            if (transactions.length === 0) return [];
            const wireTransactions = transactions.map(
                (transaction) => transactionCodec.encode(transaction) as Uint8Array
            );
            const signedTransactions = await signViaWallet(wireTransactions, config);
            return signedTransactions.map((signedTransaction, i) => {
                assertMessageUnchanged(transactions[i].messageBytes, signedTransaction.messageBytes, adapter.name);
                return getSignatureDictionary(signedTransaction);
            });
        },
    } satisfies WalletAdapterTransactionSigner);
}

function getSignTransactionMethod(adapter: Adapter): SolanaSignTransactionMethod {
    if (!('standard' in adapter && adapter.standard === true)) {
        throw new WalletSignTransactionError(
            `Wallet '${adapter.name}' is not backed by a wallet-standard wallet, so it cannot sign ` +
                `@solana/web3.js v3 or @solana/kit transactions. Use a wallet that supports the wallet ` +
                `standard (most modern wallets do).`
        );
    }
    const features = adapter.wallet.features;
    if (!(SolanaSignTransaction in features)) {
        throw new WalletSignTransactionError(
            `Wallet '${adapter.name}' does not support the '${SolanaSignTransaction}' feature. ` +
                `It can only sign and send transactions in a single step via the wallet adapter's ` +
                `own sendTransaction method.`
        );
    }
    return (features as SolanaSignTransactionFeature)[SolanaSignTransaction].signTransaction;
}

function getWalletAccount(adapter: StandardWalletAdapter, signerAddress: Address): WalletAccount {
    const account = adapter.wallet.accounts.find((account) => account.address === signerAddress);
    if (!account) {
        throw new WalletAccountError(
            `Wallet '${adapter.name}' has no account for address ${signerAddress}. ` +
                `The wallet may have switched accounts; reconnect and try again.`
        );
    }
    return account;
}

/**
 * Wrap serialized transaction *message* bytes in the wire transaction format — with an
 * all-zero placeholder signature for each required signer — so they can be passed to a
 * wallet's `solana:signTransaction` feature.
 */
function wireTransactionFromMessageBytes(messageBytes: ReadonlyUint8Array): Uint8Array {
    const { header, staticAccounts } = compiledTransactionMessageDecoder.decode(messageBytes);
    const signatures: SignaturesMap = {};
    for (const signerAddress of staticAccounts.slice(0, header.numSignerAccounts)) {
        signatures[signerAddress] = null;
    }
    return transactionCodec.encode({
        messageBytes: messageBytes as TransactionMessageBytes,
        signatures,
    }) as Uint8Array;
}

function assertMessageUnchanged(
    originalMessageBytes: ReadonlyUint8Array,
    signedMessageBytes: ReadonlyUint8Array,
    walletName: string
): void {
    if (bytesEqual(originalMessageBytes, signedMessageBytes)) return;
    throw new WalletSignTransactionError(
        `Wallet '${walletName}' modified the transaction while signing it, so its signature cannot be ` +
            `applied to the original transaction. Sign through an API that accepts a modified transaction, ` +
            `such as the signer's modifyAndSignTransactions method.`
    );
}
