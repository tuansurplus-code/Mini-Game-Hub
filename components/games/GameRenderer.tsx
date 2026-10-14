"use client";
import dynamic from "next/dynamic";
// Each game keeps its own client chunk; only the chosen game is loaded and hydrated.
export const SpinAndWinGame = dynamic(() => import("./SpinAndWinGame"));
export const ScratchAndWinGame = dynamic(() => import("./ScratchAndWinGame"));
export const PickACardGame = dynamic(() => import("./PickACardGame"));
