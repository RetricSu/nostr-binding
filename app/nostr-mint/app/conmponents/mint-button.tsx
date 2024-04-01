import { bytes } from "@ckb-lumos/codec";
import { commons, helpers } from "@ckb-lumos/lumos";
import { blockchain } from "@ckb-lumos/base";
import { useContext } from "react";
import { SingerContext } from "~/context/signer";
import { Asset } from "~/protocol/asset";
import { Mint } from "~/protocol/mint.client";
import { Serializer } from "~/protocol/serialize";
import offCKB from "offckb.config";

export interface MintButtonProp {
  setResult: (res: string) => void;
}

export function MintButton({ setResult }: MintButtonProp) {
  const context = useContext(SingerContext);
  const nostrSigner = context.nostrSigner!;
  const ckbSigner = context.ckbSigner!;
  const mint = async () => {
    const nostrPubkey = await nostrSigner.publicKey();
    const assetUnsignedEvent = Asset.buildEvent({
      name: "test-token",
    }).toUnsignedEvent(nostrPubkey);
    const assetEvent = await nostrSigner.signEvent(assetUnsignedEvent);
    const { txSkeleton, mintEvent } = await Mint.build(
      ckbSigner.ckbAddress,
      assetEvent
    );
    const event = await nostrSigner.signEvent(mintEvent);

    const eventWitness = Serializer.packEvents([event, assetEvent]);
    let tx = ckbSigner.buildSigningEntries(txSkeleton, eventWitness);
    const signedMessage = await ckbSigner.signMessage(
      tx.signingEntries.get(0)!.message
    );
    const signedWitness = bytes.hexify(
      blockchain.WitnessArgs.pack({
        lock: commons.omnilock.OmnilockWitnessLock.pack({
          signature: bytes.bytify(signedMessage).buffer,
        }),
        outputType: eventWitness,
      })
    );
    tx = tx.update("witnesses", (witnesses: Immutable.List<string>) =>
      witnesses.set(0, signedWitness)
    );

    const signedTx = helpers.createTransactionFromSkeleton(tx);
    console.log(signedTx);
    const txHash = await offCKB.rpc.sendTransaction(signedTx, "passthrough");

    setResult(
      "Mint token: /n/n" +
        "tx hash: " +
        txHash +
        JSON.stringify(signedTx, null, 2)
    );
  };

  return <button onClick={mint}>Mint</button>;
}
