import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { NostrSigner } from "@rust-nostr/nostr-sdk";
import { useState } from "react";
import { SingerContext } from "./context/signer";

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
  const [signer, setSigner] = useState<NostrSigner | null>(null);
  const value = { signer, setSigner };
  return (
    <SingerContext.Provider value={value}>
      <Outlet />
    </SingerContext.Provider>
  );
}
