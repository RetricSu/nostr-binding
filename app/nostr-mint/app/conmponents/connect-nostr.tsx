import { Nip07Signer, NostrSigner } from "@rust-nostr/nostr-sdk";
import { useContext, useState } from "react";
import { SingerContext } from "~/context/signer";

export function ConnectNostr() {
  const [nostrPubkey, setNostrPubkey] = useState<string>();
  const { signer, setSigner } = useContext(SingerContext)!;

  const connect = async () => {
    if (!signer) {
      const nip07_signer = new Nip07Signer();
      const signer = NostrSigner.nip07(nip07_signer);
      setSigner(signer);
    }

    const pubkey = await signer!.publicKey();
    setNostrPubkey(pubkey.toHex());
  };

  return (
    <button onClick={connect}>
      {nostrPubkey
        ? `user: ${nostrPubkey.slice(0, 4)}..${nostrPubkey.slice(-4)}`
        : "connect nostr account"}
    </button>
  );
}
