import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
} from "@remix-run/react";
import { NostrSigner } from "@rust-nostr/nostr-sdk";
import { useState } from "react";
import { CKBSigner, SingerContext } from "./context/signer";
import { Buffer } from "buffer";

globalThis.Buffer = Buffer as unknown as BufferConstructor;

export async function loader() {
  return json({
    ENV: {
      NETWORK: process.env.NETWORK,
    },
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  const [nostrSigner, setNostrSigner] = useState<NostrSigner | null>(null);
  const [ckbSigner, setCKBSigner] = useState<CKBSigner | null>(null);

  const value = { nostrSigner, setNostrSigner, ckbSigner, setCKBSigner };
  return (
    <SingerContext.Provider value={value}>
      <Outlet />
      <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(
              data.ENV
            )}`,
          }}
        />
    </SingerContext.Provider>
  );
}
