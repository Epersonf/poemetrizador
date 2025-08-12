import { Utils } from "./utils.js";
import { Syllabifier } from "./syllabifier.js";
import { Sinalefa } from "./sinalefa.js";
import { Prosody } from "./prosody.js";
import { Analyzer } from "./analyzer.js";

export const Poemetrizador = { Utils, Syllabifier, Sinalefa, Prosody, Analyzer };

if (typeof window !== "undefined") window.Poemetrizador = Poemetrizador;
