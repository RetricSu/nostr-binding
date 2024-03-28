import { NostrSigner } from "@rust-nostr/nostr-sdk";
import { createContext } from "react";

interface SingerContextType {
  signer: NostrSigner | null;
  setSigner: (signer: NostrSigner) => void;
}

export const defaultSingerContext = {
  signer: null,
  setSigner: () => {},
};

export const SingerContext =
  createContext<SingerContextType>(defaultSingerContext);
