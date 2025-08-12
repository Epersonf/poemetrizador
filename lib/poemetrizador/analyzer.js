import { Utils } from "./utils.js";
import { Prosody } from "./prosody.js";

export class Analyzer {
  static analyze(text){
    const lines = text.replace(/\r/g,"").split("\n");
    const verses = lines.filter(l=>l.trim().length>0);

    const normalRows = verses.map(line=>{
      const s = Utils.tokens(line).flatMap(w=>window.Poemetrizador.Syllabifier.syllabifyWord(w));
      return `${s.join("-")}  ---->  (${s.length} sílabas)`;
    });

    const sinalRows = verses.map(line=>{
      const sc = Prosody.scanLine(line);
      const pretty = sc.viewSyl.join("-");
      const tot = sc.plainSyl.length;
      const det = (sc.count!==tot)?` [${sc.count} = ${tot}-${(tot-sc.count)}]`:"";
      const rhyme = Prosody.rhymeKey(line) || "—";
      const ritmo = sc.stresses.sort((a,b)=>a-b).join(",");
      const coincideIambo = Prosody.coincidence(sc.stresses,[2,4,6,8,10]);
      return `${pretty}  ---->  (${sc.count} sílabas${det}, ritmo: ${ritmo}). Rima com "${rhyme}".\n` +
             `  (verso iâmbo ou acentos rítmicos [2,4,6,8,10][∪–], coincidência ${coincideIambo}%).\n` +
             `  ${Prosody.peonio(sc.stresses)}\n` +
             `  ${Prosody.jonicoMaior(sc.stresses)}`;
    });

    const syllCounts = verses.map(l=>Prosody.scanLine(l).count);
    const blocks = Utils.chunkByBlank(lines).map(b=>{
      const ks=b.filter(l=>l.trim()).map(l=>Prosody.rhymeKey(l));
      return Utils.schemeLetters(ks).join("");
    }).filter(Boolean);

    const summaryHTML =
`<div class="mono">Análise de estrofas (esquema métrico):
${blocks.join(" ")}
${syllCounts.join("-")}
Contém ${verses.length} versos.</div>`;

    return { normalRows, sinalRows, summaryHTML, verses, lines };
  }
}
