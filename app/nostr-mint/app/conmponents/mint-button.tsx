import { PublicKey } from "@rust-nostr/nostr-sdk";
import { useContext } from "react";
import { SingerContext } from "~/context/signer";
import { Mint } from "~/protocol/mint";

export interface MintButtonProp {
  setResult: (res: string) => void;
}

export function MintButton({ setResult }: MintButtonProp) {
  const context = useContext(SingerContext);
  const signer = context.signer!;
  const mint = async () => {
    const assetEventId =
      "1a665f9ef1a0a08dbf0a59270d422a8671fe777dcdb909797e3ee64a765f5e1c";
    const cellTypeId =
      "ec5ebc8524007a3d0522091c7a78a3d6ad571a7ddb40c8215f7754d79175b9e1";
    const pubkey = await signer.publicKey();
    const owner = pubkey.toHex();
    const mintEvent = Mint.buildEvent(assetEventId, cellTypeId, owner);
    
    const powEvent = mintEvent.toUnsignedPowEvent(PublicKey.fromHex(owner), 10);
    const event = await signer.signEvent(powEvent);
    setResult(
      "Mint Pow Event: /n/n" +
        JSON.stringify(JSON.parse(event.asJson()), null, 2)
    );
  };

  return <button onClick={mint}>Mint</button>;
}
