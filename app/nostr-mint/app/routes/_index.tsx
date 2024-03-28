import type { MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { ConnectNostr } from "~/conmponents/connect-nostr";
import { MintButton } from "~/conmponents/mint-button";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const [result, setResult] = useState<string>();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Nostr binding</h1>
      <ConnectNostr />

      <ul>
        <li>
          <MintButton setResult={setResult} />
        </li>
        <li>
          <button>My tokens</button>
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
