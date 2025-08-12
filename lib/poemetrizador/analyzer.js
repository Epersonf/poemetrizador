import { Utils } from "./utils.js";
import { Prosody } from "./prosody.js";

export class Analyzer {
  static analyze(text){
    const lines = text.replace(/\r/g,"").split("\n");
    const verses = lines.filter(l=>l.trim().length>0);

    // “Separação normal” (como no gabarito)
    const normalRows = verses.map(line=>{
      const ws = Utils.tokens(line);
      const parts = ws.map(w => window.Poemetrizador.Syllabifier.syllabifyWord(w).join("-"));
      const joined = parts.join("-");
      const total = joined.split("-").filter(Boolean).length;
      return `${joined}  ---->  (${total} sílabas)`;
    });

    // “Com sinalefas” + métricas
    const sinalRows = verses.map(line=>{
      const sc = Prosody.scanLine(line);
      const pretty = sc.viewSyl.join("-");
      const tot = sc.plainSyl.length;
      const det = (sc.count!==tot)?` [${sc.count} = ${tot}-${(tot-sc.count)}]`:"";
      const rhyme = Prosody.rhymeKey(line) || "—";
      const ritmo = [...new Set(sc.stresses)].sort((a,b)=>a-b).join(",");
      const coincideIambo = Prosody.coincidence(sc.stresses,[2,4,6,8,10]);
      return `${pretty}  ---->  (${sc.count} sílabas${det}, ritmo: ${ritmo}). Rima com "${rhyme}".\n` +
             `  (verso iâmbo ou acentos rítmicos [2,4,6,8,10][∪–], coincidência ${coincideIambo}%).\n` +
             `  ${Prosody.peonio(sc.stresses)}\n` +
             `  ${Prosody.jonicoMaior(sc.stresses)}`;
    });

    // === ESQUEMA DE RIMA GLOBAL ===
    // mapeia chaves de rima para letras ao longo de TODO o poema
    const blocksByStanza = Utils.chunkByBlank(lines).map(b => b.filter(l=>l.trim()));
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

    const syllCounts = verses.map(l=>Prosody.scanLine(l).count);
    const summaryHTML =
`<div class="mono">Análise de estrofas (esquema métrico):
${stanzaSchemes.join(" ")}
${syllCounts.join("-")}
Contém ${verses.length} versos.</div>`;

    return { normalRows, sinalRows, summaryHTML, verses, lines };
  }
}
