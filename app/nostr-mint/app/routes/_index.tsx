import type { MetaFunction } from "@remix-run/node";
import { Event } from "@rust-nostr/nostr-sdk";
import { useState } from "react";
import { AssetButton } from "~/conmponents/asset-button";
import { ConnectMetamask } from "~/conmponents/connect-metamask";
import { ConnectNostr } from "~/conmponents/connect-nostr";
import { MintButton } from "~/conmponents/mint-button";
import { UnlockButton } from "~/conmponents/unlock-button";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const [result, setResult] = useState<string>();
  const [assetEvent, setAssetEvent] = useState<Event>();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Nostr binding</h1>
      <ConnectNostr /> <ConnectMetamask />
      <ul>
        <li>
          <MintButton setAssetEvent={setAssetEvent} setResult={setResult} />
          {assetEvent && (
            <UnlockButton assetEvent={assetEvent} setResult={setResult} />
          )}
        </li>
        <li>
          <AssetButton assetEvent={assetEvent} setResult={setResult}/>
        </li>
        <li>
          <button>Explore</button>
        </li>
      </ul>
      <hr />
      <div>{result}</div>
    </div>
  );
}
