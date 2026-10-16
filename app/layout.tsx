import "./globals.css";
import type { Metadata } from "next";
// Nonces are unique per HTML response, including authentication pages.
export const dynamic = "force-dynamic";
export const metadata: Metadata={title:"Mini Game Hub",description:"Play mini games and win exciting rewards."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
