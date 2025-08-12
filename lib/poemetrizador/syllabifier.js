import { Utils } from "./utils.js";

export class Syllabifier {
  // Heurística hiato vs ditongo
  static isHiato(word, i){
    const a = word[i], b = word[i+1];
    if (!a || !b) return false;

    // se a 2ª vogal é acentuada → hiato (pa-ís, sa-ú-de)
    if (/[áâãéêíóôú]/.test(b)) return true;

    const par = a + b;

    // ditongos comuns (não separar)
    const DIT = new Set(["ai","ei","oi","au","eu","ou","ui","iu","ão","õe","ãi"]);
    if (DIT.has(par)) return false;

    // hiatos frequentes
    const HI = new Set(["ua","uo","eo","oa","oo","ee"]);
    if (HI.has(par)) {
      // exceção QU/GU + a/o
      if (i>=1 && word[i-1]==="u" && (word[i-2]==="q" || word[i-2]==="g")) return false;
      return true;
    }

    // 'io'/'ia' em fim de palavra → hiato (ri-o, Ma-ri-a)
    if ((par === "io" || par === "ia") && i+1 === word.length-1) return true;

    // interno: preferir ditongo (his-tó-rias)
    return false;
  }

  static syllabifyWord(raw){
    let w = Utils.norm(raw); if(!w) return [];
    w = Utils.protectDigraphs(w);

    const chars = [...w];
    const syl = [];
    let i = 0;
    let carryOnset = "";

    while (i < chars.length){
      let s = "";

      // onset
      if (carryOnset) { s += carryOnset; carryOnset = ""; }
      while (i < chars.length && !Utils.V_RE.test(chars[i])) { s += chars[i]; i++; }

      // núcleo (>=1 vogal)
      if (i < chars.length && Utils.V_RE.test(chars[i])) {
        s += chars[i];
        while (i + 1 < chars.length && Utils.V_RE.test(chars[i+1])) {
          if (Syllabifier.isHiato(w, i)) break; // hiato: para antes da próxima vogal
          i++;
          s += chars[i];
        }
        i++; // consumiu a última vogal do núcleo
      } else {
        syl.push(s);
        continue;
      }

      // bloco consonantal após o núcleo
      let j = i;
      while (j < chars.length && !Utils.V_RE.test(chars[j])) j++;
      const cons = chars.slice(i, j).join("");

      if (cons.length === 0){
        syl.push(s); i = j; continue;
      }

      // *** ajuste: C final de palavra fica como coda ***
      if (cons.length === 1){
        const noNextVowel = (j === chars.length); // fim da palavra
        if (noNextVowel){
          s += cons; syl.push(s); i = j;
        } else {
          syl.push(s); carryOnset = cons; i = j;
        }
        continue;
      }

      // cons >= 2 → VC-CV, com exceção a onsets válidos (… CCV)
      const last2 = cons.slice(-2).toLowerCase();
      if (Utils.ONSETS.includes(last2)){
        const coda = cons.slice(0, cons.length - 2);
        s += coda; syl.push(s); carryOnset = cons.slice(-2); i = j;
      } else {
        const coda = cons.slice(0, cons.length - 1);
        s += coda; syl.push(s); carryOnset = cons.slice(-1); i = j;
      }
    }

    const out = syl.filter(Boolean).map(Utils.unprotectDigraphs);
    return out;
  }
}
