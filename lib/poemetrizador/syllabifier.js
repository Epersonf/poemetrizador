import { Utils } from "./utils.js";

export class Syllabifier {
  // Heurística de hiato vs ditongo
  static isHiato(word, i){
    const a = word[i], b = word[i+1];
    if (!a || !b) return false;
    // regra: se a SEGUNDA vogal é acentuada, força hiato (pa-ís, sa-ú-de, ca-í-da)
    if (/[áâãéêíóôú]/.test(b)) return true;

    const par = a + b;
    // ditongos comuns (não separar)
    const DIT = new Set(["ai","ei","oi","au","eu","ou","ui","iu","ão","õe","ãi"]);
    if (DIT.has(par)) return false;

    // hiatos que queremos separar com frequência:
    // ua (lua), uo, eo, oa, oo, ee
    const HI = new Set(["ua","uo","eo","oa","oo","ee"]);
    if (HI.has(par)) {
      // exceção QU/GU + a/o (qua/gua/quo/guo → não separar)
      if (i>=1 && word[i-1]==="u" && (word[i-2]==="q" || word[i-2]==="g")) return false;
      return true;
    }
    // por padrão, NÃO tratar "ia/io" como hiato (histórias → rias)
    return false;
  }

  static syllabifyWord(raw){
    let w = Utils.norm(raw); if(!w) return [];
    w = Utils.protectDigraphs(w);

    const chars = [...w];
    const syl = [];
    let i = 0;
    let carryOnset = ""; // consoantes reservadas para o onset da próxima sílaba

    while (i < chars.length){
      let s = "";

      // 1) onset: consoantes até a primeira vogal + o que sobrou da sílaba anterior
      if (carryOnset) { s += carryOnset; carryOnset = ""; }
      while (i < chars.length && !Utils.V_RE.test(chars[i])) { s += chars[i]; i++; }

      // 2) núcleo (>=1 vogal)
      if (i < chars.length && Utils.V_RE.test(chars[i])) {
        s += chars[i];
        while (i + 1 < chars.length && Utils.V_RE.test(chars[i+1])) {
          if (Syllabifier.isHiato(w, i)) break; // corta aqui (hiato)
          i++;
          s += chars[i];
        }
        i++; // consumiu última vogal do núcleo
      } else {
        // não há vogal — fecha e segue (abreviatura etc.)
        syl.push(s);
        continue;
      }

      // 3) bloco consonantal após o núcleo
      let j = i;
      while (j < chars.length && !Utils.V_RE.test(chars[j])) j++;
      const cons = chars.slice(i, j).join("");

      if (cons.length === 0){
        syl.push(s);
        i = j;
        continue;
      }

      if (cons.length === 1){
        // V C V → V - CV
        syl.push(s);
        carryOnset = cons;
        i = j;
        continue;
      }

      // cons >= 2 → regra VC-CV, com exceção a onsets válidos (… CCV)
      const last2 = cons.slice(-2).toLowerCase();
      if (Utils.ONSETS.includes(last2)){
        const coda = cons.slice(0, cons.length - 2);
        s += coda;
        syl.push(s);
        carryOnset = cons.slice(-2);
        i = j;
      } else {
        const coda = cons.slice(0, cons.length - 1);
        s += coda;
        syl.push(s);
        carryOnset = cons.slice(-1);
        i = j;
      }
    }

    // repõe dígrafos e retorna
    const out = syl.filter(Boolean).map(Utils.unprotectDigraphs);
    return out;
  }
}
