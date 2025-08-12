import { Utils } from "./utils.js";
import { Syllabifier } from "./syllabifier.js";
import { Prosody } from "./prosody.js";

export class Analyzer {
  static analyze(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const verses = lines.filter(l => l.trim().length > 0);

    // Separação normal (sem sinalefa)
    const normalRows = verses.map(line => {
      const ws = Utils.tokens(line);
      const parts = ws.map(w => window.Poemetrizador.Syllabifier.syllabifyWord(w).join("-"));
      const joined = parts.join("-");
      const total = joined.split("-").filter(Boolean).length;
      const back = Prosody.stressBackOffset(ws[ws.length - 1] || "");
      const poetic = Math.max(1, total - back);
      return `${joined}  ---->  (${poetic} sílabas[${poetic} = ${total}-${back}])`;
    });

    // Com sinalefas (sem rotular tipo de verso)
    const sinalRows = verses.map(line => {
      const sc = Prosody.scanLine(line);
      const pretty = sc.viewSyl.join("-");
      const tot = sc.plainSyl.length;
      const det = (sc.count !== tot) ? `[${sc.count} = ${tot}-${(tot - sc.count)}]` : "";
      const rhymeDisp = Prosody.rhymeDisplay(line) || "—";
      const ritmo = [...new Set(sc.stresses)].sort((a, b) => a - b).join(",");
      return `${pretty}  🠒  (${sc.count} sílabas${det}, ritmo: ${ritmo}).\nRima com "${rhymeDisp}".`;
    });

    // === ESQUEMA DE RIMA GLOBAL ===
    // mapeia chaves de rima para letras ao longo de TODO o poema
    const blocksByStanza = Utils.chunkByBlank(lines).map(b => b.filter(l => l.trim()));
    const globalMap = new Map(); const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let next = 0;
    const stanzaSchemes = [];

    for (const stanza of blocksByStanza) {
      const keys = stanza.map(l => Prosody.rhymeKey(l));
      const letters = keys.map(k => {
        if (!k) return "";
        if (!globalMap.has(k)) globalMap.set(k, abc[next++] || "?");
        return globalMap.get(k);
      });
      stanzaSchemes.push(letters.join(""));
    }

    const syllCounts = verses.map(l => Prosody.scanLine(l).count);
    const summaryHTML =
      `<div class="mono">Análise de estrofas (esquema métrico):
${stanzaSchemes.join(" ")}
${syllCounts.join("-")}
Contém ${verses.length} versos.</div>`;

    return { normalRows, sinalRows, summaryHTML, verses, lines };
  }
}
