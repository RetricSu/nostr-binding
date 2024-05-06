import { bytes } from "@ckb-lumos/codec";
import { helpers } from "@ckb-lumos/lumos";
import { blockchain } from "@ckb-lumos/base";
import { ReactNode, useContext } from "react";
import { SingerContext } from "~/context/signer";
import { Asset } from "~/protocol/event/asset";
import { Mint } from "~/protocol/event/mint.client";
import { Serializer } from "~/protocol/serialize";
import offCKB from "offckb.config";
import { Event } from "@rust-nostr/nostr-sdk";

export interface MintButtonProp {
  setResult: (res: string | ReactNode) => void;
  setAssetEvent: (event: Event) => void;
}

export function MintButton({ setResult, setAssetEvent }: MintButtonProp) {
  const context = useContext(SingerContext);
  const nostrSigner = context.nostrSigner!;
  const ckbSigner = context.ckbSigner!;

  const mint = async () => {
    const nostrPubkey = await nostrSigner.publicKey();
    const content = "This is the definition of the Test-NFT token";
    const assetUnsignedEvent = Asset.buildEvent(
      {
        name: "Test-NFT token",
        description: "There are only 100 NFT in total.",
      },
      content
    ).toUnsignedEvent(nostrPubkey);
    const assetEvent = await nostrSigner.signEvent(assetUnsignedEvent);
    const { txSkeleton, mintEvent } = await Mint.buildTransaction(
      ckbSigner.ckbAddress,
      assetEvent
    );
    const event = await nostrSigner.signEvent(mintEvent);
    setAssetEvent(event);

    const eventWitness = Serializer.packEvents([event, assetEvent]);
    let tx = ckbSigner.buildSigningEntries(txSkeleton, eventWitness);
    const signedMessage = await ckbSigner.signMessage(
      tx.signingEntries.get(0)!.message
    );
    let signedLockEvent = Event.fromJson(signedMessage);
    const lockEventWitness = Serializer.packEvents([signedLockEvent]);
    const signedWitness = bytes.hexify(
      blockchain.WitnessArgs.pack({
        lock: lockEventWitness,
        outputType: eventWitness,
      })
    );
    tx = tx.update("witnesses", (witnesses: Immutable.List<string>) =>
      witnesses.set(0, signedWitness)
    );

    const signedTx = helpers.createTransactionFromSkeleton(tx);
    const txHash = await offCKB.rpc.sendTransaction(signedTx, "passthrough");

    setResult(
      <div className="overflow-x-scroll">
        <div>Mint token tx: {txHash}</div>
        <code className="whitespace-pre">
          {JSON.stringify(signedTx, null, 2)}
        </code>
      </div>
    );
  };

  return (
    <div>
      <button onClick={mint}>Mint</button>
    </div>
  );
}
