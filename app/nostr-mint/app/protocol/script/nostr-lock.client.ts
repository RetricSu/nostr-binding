import { CellDep, helpers } from "@ckb-lumos/lumos";
import { PublicKey } from "@rust-nostr/nostr-sdk";
import offCKBConfig from "offckb.config";

const lumosConfig = offCKBConfig.lumosConfig;

export class NostrLock {
  public static buildScript(ownerPubkey: PublicKey) {
    const lockArgs = "0x" + ownerPubkey.toHex();
    return {
      codeHash: lumosConfig.SCRIPTS.NOSTR_LOCK!.CODE_HASH,
      hashType: lumosConfig.SCRIPTS.NOSTR_LOCK!.HASH_TYPE,
      args: lockArgs,
    };
  }

  public static encodeToCKBAddress(ownerPubkey: PublicKey) {
    const lockScript = this.buildScript(ownerPubkey);
    const address = helpers.encodeToAddress(lockScript);
    return address;
  }

  public static parseCBKAddressToNostrPubkey(ckbAddress: string){
    const script = helpers.parseAddress(ckbAddress);
    if(script.codeHash !== lumosConfig.SCRIPTS.NOSTR_LOCK!.CODE_HASH || script.hashType !== lumosConfig.SCRIPTS.NOSTR_LOCK!.HASH_TYPE){
      throw new Error("nostr-lock contract script info not match!");
    }

    return script.args;
  }

  public static buildCellDeps() {
    const cellDeps: CellDep[] = [
      {
        outPoint: {
          txHash: lumosConfig.SCRIPTS.NOSTR_LOCK!.TX_HASH,
          index: lumosConfig.SCRIPTS.NOSTR_LOCK!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.NOSTR_LOCK!.DEP_TYPE,
      },
      {
        outPoint: {
          txHash: lumosConfig.SCRIPTS.AUTH!.TX_HASH,
          index: lumosConfig.SCRIPTS.AUTH!.INDEX,
        },
        depType: lumosConfig.SCRIPTS.AUTH!.DEP_TYPE,
      },
    ];
    return cellDeps;
  }
}
