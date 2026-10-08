import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif, Noto_Sans_SC } from "next/font/google";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", axes: ["wdth", "opsz"] });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
const cjk = Noto_Sans_SC({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-cjk", preload: false });

/** The font CSS variables every page sets on <html>. */
export const fontVariables = `${sans.variable} ${mono.variable} ${display.variable} ${serif.variable} ${cjk.variable}`;
