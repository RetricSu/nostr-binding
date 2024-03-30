import { Script } from "@ckb-lumos/lumos";
import { NostrSigner } from "@rust-nostr/nostr-sdk";
import { createContext } from "react";

export interface CKBSigner {
  ckbAddress: string;
  lockScript: Script;
  originAddress: string; // eth wallet/unisat ... the original address
  signMessage: (message: string) => Promise<string>;
  buildSigningEntries: (tx: any) => any;
}

export interface SingerContextType {
  nostrSigner: NostrSigner | null;
  setNostrSigner: (signer: NostrSigner) => void;
  ckbSigner: CKBSigner | null;
  setCKBSigner: (signer: CKBSigner) => void;
}

export const defaultSingerContext = {
  nostrSigner: null,
  setNostrSigner: () => {},
  ckbSigner: null,
  setCKBSigner: () => {},
};

export const SingerContext =
  createContext<SingerContextType>(defaultSingerContext);
