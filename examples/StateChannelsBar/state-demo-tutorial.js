// "@aeternity/aepp-sdk": "https://github.com/aeternity/aepp-sdk-js.git#2.1.1-0.1.0-next",

const {
    MemoryAccount,
    Channel,
    Crypto,
    Universal,
    TxBuilder
} = require('@aeternity/aepp-sdk')

const {
    API_URL,
    INTERNAL_API_URL,
    STATE_CHANNEL_URL,
    NETWORK_ID,
    RESPONDER_HOST,
    RESPONDER_PORT
} = require('./config/nodeConfig');


const initiatorKeyPair = {
    publicKey: 'ak_2mwRmUeYmfuW93ti9HMSUJzCk1EYcQEfikVSzgo6k2VghsWhgU',
    secretKey: 'bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca'
}

const responderKeyPair = {
    publicKey: 'ak_fUq2NesPXcYZ1CcqBcGC3StpdnQw3iVxMA3YSeCNAwfN4myQk',
    secretKey: '7c6e602a94f30e4ea7edabe4376314f69ba7eaa2f355ecedb339df847b6f0d80575f81ffb0a297b7725dc671da0b1769b1fc5cbe45385c7b5ad1fc2eaf1d609d'
}

const DEPOSIT_AMOUNT = 50000000000;
const updateAmount = parseInt(DEPOSIT_AMOUNT * 0.1);

const initiatorAddress = initiatorKeyPair.publicKey;
const responderAddress = responderKeyPair.publicKey;

let initiatorAccount;
let responderAccount;

console.log('------------------ STATE CHANNEL DEMO -----------------------')

const params = {
    // Public key of initiator
    // (in this case `initiatorAddress` defined earlier)
    initiatorId: initiatorAddress,
    // Public key of responder
    // (in this case `responderAddress` defined earlier)
    responderId: responderAddress,
    // Initial deposit in favour of the responder by the initiator
    pushAmount: 0,
    // Amount of tokens initiator will deposit into state channel
    initiatorAmount: DEPOSIT_AMOUNT,
    // Amount of tokens responder will deposit into state channel
    responderAmount: DEPOSIT_AMOUNT,
    // Minimum amount both peers need to maintain
    channelReserve: parseInt(DEPOSIT_AMOUNT / 2),
    // Minimum block height to include the channel_create_tx
    ttl: 1000,
    // Amount of blocks for disputing a solo close
    lockPeriod: 10,
    // Host of the responder's node
    host: RESPONDER_HOST,
    // Port of the responders node
    port: RESPONDER_PORT,
}

createAccounts().then(() => {

    // initiator connects to state channels endpoint
    connectAsInitiator(params).then(initiatorChannel => {

        console.log('INITIATOR CHANNEL');

        initiatorChannel.on('statusChanged', (status) => {
            console.log(`[INITIATOR] status: [${status.toUpperCase()}]`);
        })

        initiatorChannel.on('onChainTx', (tx) => {
            console.log('[INITIATOR] onChainTx:', tx)
        })

        // off chain balances
        //getOffChainBalances1(initiatorChannel)

        initiatorChannel.sendMessage('hello world', responderAddress)

        if (true) {
            initiatorChannel.update(
                // Sender account
                initiatorAddress,
                // Recipient account
                responderAddress,
                // Amount
                updateAmount,
                // This function should verify offchain transaction
                // and sign it with initiator's private key
                async (tx) => initiatorAccount.signTransaction(tx)
            ).then((result) => {
                console.log(`[INITIATOR] update result:`, result);
                // if (result.accepted) {
                //     console.log('==> Successfully transfered 10 tokens!', result)
                // } else {
                //     //console.log('=====> Transfer has been rejected')
                // }
            }).catch(e => {
                console.log('==> Error:', e);
            })
        }

        initiatorChannel.on('error', err => console.log(err))

        
        // setTimeout(() => {
        //     // initiatorChannel.leave().then(({channelId, state}) => {
        //     //     console.log('=*=> leaving the channel');
        //     //     console.log(channelId);
        //     //     console.log(state);
        //     // })
        // }, 15000)

    }).catch(err => {
        console.log('==> Initiator failed to connect')
        console.log(err)
    })

    // responder connects to state channels endpoint
    connectAsResponder(params).then(responderChannel => {

        console.log('RESPONDER CHANNEL');

        responderChannel.on('message', (msg) => {
            console.log('[RESPONDER] ==> Received message from:', msg)
        });

        responderChannel.on('statusChanged', (status) => {
            console.log(`[RESPONDER] status: [${status.toUpperCase()}]`);
        });

        responderChannel.on('onChainTx', (tx) => {
            console.log('[RESPONDER] onChainTx:', tx)
        });

        // close channel after a minute
        setTimeout(() => {
            responderChannel.shutdown(
                // This function should verify shutdown transaction
                // and sign it with responder's secret key 
                async (tx) => responderAccount.signTransaction(tx)
            ).then((tx) => {
                console.log('==> State channel has been closed. You can track this transaction onchain', tx)
            }).catch(e => {
                console.log('==> Error:', e);
            })
        }, 25000);

        responderChannel.on('error', err => console.log(err))
    }).catch(err => {
        console.log('==> Responder failed to connect')
        console.log(err)
    });

    async function getOffChainBalances2(channel) {
        // off chain balances
       let balances = await channel.balances([ initiatorKeyPair.publicKey, responderKeyPair.publicKey]);
       console.log('-=-=>> off chain balance 2')
       console.log(balances[initiatorKeyPair.publicKey])
       console.log(balances[responderKeyPair.publicKey])
   }

    function getOffChainBalances1(channel) {
        // off chain balances
        channel.balances([
            initiatorKeyPair.publicKey, 
            responderKeyPair.publicKey])
            .then(function (balances) {
                console.log('-=-=>> off chain balance 1')
                console.log(balances[initiatorKeyPair.publicKey])
                    console.log(balances[responderKeyPair.publicKey])
            }).catch(e => console.log(e))
    }
});

async function createAccounts() {
    initiatorAccount = await Universal({
        networkId: NETWORK_ID,
        url: API_URL,
        internalUrl: INTERNAL_API_URL,
        keypair: initiatorKeyPair
    })
    responderAccount = await Universal({
        networkId: NETWORK_ID,
        url: API_URL,
        internalUrl: INTERNAL_API_URL,
        keypair: responderKeyPair
    })
}

async function initiatorSign(tag, tx) {
    const txData = deserializeTx(tx, true);
    console.log('[TAG] initiatorSign:', txData.tag);

    if (tag === 'initiator_sign' || txData.tag === 'CHANNEL_CREATE_TX') {
        return initiatorAccount.signTransaction(tx)
    }

    if (tag === 'shutdown_sign_ack' || txData.tag === 'CHANNEL_CLOSE_MUTUAL_TX') {
        return initiatorAccount.signTransaction(tx);
    }

    console.log('[INITIATOR] ==> NOT handled action');
}

async function responderSign(tag, tx) {
    const txData = deserializeTx(tx);
    console.log('[TAG] responderSign:', txData.tag);

    if (tag === 'responder_sign' || txData.tag === 'CHANNEL_CREATE_TX') {
        return responderAccount.signTransaction(tx)
    }

    // Deserialize binary transaction so we can inspect it

    // When someone wants to transfer a tokens we will receive
    // a sign request with `update_ack` tag
    if (tag === 'update_ack'|| txData.tag === 'CHANNEL_OFFCHAIN_TX') {
        return responderAccount.signTransaction(tx)
    }

    if (tag === 'shutdown_sign_ack' || txData.tag === 'CHANNEL_CLOSE_MUTUAL_TX') {
        return responderAccount.signTransaction(tx);
    }

    console.log('[RESPONDER] ==> NOT handled action');
}

async function connectAsInitiator(params) {
    return Channel({
        ...params,
        url: STATE_CHANNEL_URL,
        role: 'initiator',
        sign: initiatorSign
    })
}

async function connectAsResponder(params) {
    return Channel({
        ...params,
        url: STATE_CHANNEL_URL,
        role: 'responder',
        sign: responderSign
    })
}

function deserializeTx(tx, showInfo) {
    const txData = Crypto.deserialize(Crypto.decodeTx(tx), {
        prettyTags: true
    })

    // const txData = TxBuilder.unpackTx(tx);

    if (showInfo) {
        console.log(txData);
    }
    
    return txData;
}