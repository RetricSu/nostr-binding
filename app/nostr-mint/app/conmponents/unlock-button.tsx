import { bytes } from "@ckb-lumos/codec";
import { Script, helpers } from "@ckb-lumos/lumos";
import { blockchain } from "@ckb-lumos/base";
import { useContext } from "react";
import { SingerContext } from "~/context/signer";
import { Serializer } from "~/protocol/serialize";
import offCKB from "offckb.config";
import { Unlock } from "~/protocol/event/unlock.client";
import {
  buildAlwaysSuccessLock,
  computeTransactionHash,
} from "~/protocol/ckb-helper.client";
import { Event } from "@rust-nostr/nostr-sdk";
import { NostrBinding } from "~/protocol/script/nostr-binding.client";
import offCKBConfig from "offckb.config";

export interface UnlockButtonProp {
  assetEvent: Event;
  setResult: (res: string) => void;
}

export function UnlockButton({ setResult, assetEvent }: UnlockButtonProp) {
  const context = useContext(SingerContext);
  const nostrSigner = context.nostrSigner!;

  const onUnlock = async () => {
    const eventId = assetEvent.id.toHex();
    const typeIdTag = assetEvent.tags.find(
      (t) => t.asVec()[0] === "cell_type_id"
    );
    if (!typeIdTag) {
      return alert("invalid asset event!");
    }
    const typeId = typeIdTag.asVec()[1];
    const type = NostrBinding.buildScript(eventId, typeId);
    return await unlock(type);
  };

  const unlock = async (type: Script) => {
    const nostrPubkey = await nostrSigner.publicKey();
    const newLock = buildAlwaysSuccessLock();
    let txSkeleton = await Unlock.buildCKBTransaction(
      nostrPubkey,
      newLock,
      type
    );

    const lumosConfig = offCKBConfig.lumosConfig;
    txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
      cellDeps.push({
        outPoint: {
          txHash: lumosConfig.SCRIPTS.NOSTR_BINDING!.TX_HASH,
          index: lumosConfig.SCRIPTS.NOSTR_BINDING!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.NOSTR_BINDING!.DEP_TYPE,
      }) 
    );

    const tx = helpers.createTransactionFromSkeleton(txSkeleton);
    const txHash = computeTransactionHash(tx).slice(2);

    const unlockEvent = Unlock.buildEvent(txHash).toUnsignedPowEvent(
      nostrPubkey,
      Unlock.unlockDifficulty
    );
    const event = await nostrSigner.signEvent(unlockEvent);

    const eventWitness = Serializer.packEvents([event]);
    const witness = bytes.hexify(
      blockchain.WitnessArgs.pack({ lock: eventWitness })
    );
    txSkeleton = txSkeleton.update(
      "witnesses",
      (witnesses: Immutable.List<string>) => witnesses.set(0, witness)
    );
    const signedTx = helpers.createTransactionFromSkeleton(txSkeleton);
    const realTxHash = await offCKB.rpc.sendTransaction(
      signedTx,
      "passthrough"
    );
    setResult("transfer tx: " + realTxHash);
  };

  return (
    <div>
      <button onClick={onUnlock}>Transfer</button>
    </div>
  );
}
