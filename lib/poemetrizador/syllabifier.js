import { Utils } from "./utils.js";

export class Syllabifier {
  // Hiato x ditongo (heurístico), com exceções p/ QU/GU + a/o
  static isHiato(word, i){
    const a = word[i], b = word[i+1];
    if(!a || !b) return false;
    const par = a + b;

    // Ditongos mais comuns (não separar)
    const DIT = new Set(["ai","ei","oi","au","eu","ou","ui","iu","õe","ão","ãi"]);
    if (DIT.has(par)) return false;

    // Hiatos que nos interessam (separar)
    const HI = new Set(["ua","uo","ia","io","eo","oa","oo","ee","ii","uu","ea","eo"]);
    if (HI.has(par)) {
      // exceção QU/GU + a/o (qua/gua/quo/guo → não separar)
      if (i >= 1 && word[i-1] === "u" && (word[i-2] === "q" || word[i-2] === "g")) return false;
      return true;
    }
    // fallback: se são duas vogais iguais acentuadas/hiáticas, separe
    if (Utils.V_RE.test(a) && Utils.V_RE.test(b) && a !== b && /[áâãéêíóôú]/.test(b)) return true;

    return false;
  }

  static syllabifyWord(raw){
    let w = Utils.norm(raw);
    if(!w) return [];
    w = Utils.protectDigraphs(w);

    const chars = [...w];
    const syl = [];
    let i = 0;
    let carryOnset = ""; // consoantes que devem ir para o próximo ataque (onset)

    while(i < chars.length){
      let s = "";

      // 1) onset: carrega o que veio da etapa anterior + consoantes até a 1ª vogal
      if (carryOnset) { s += carryOnset; carryOnset = ""; }
      while(i < chars.length && !Utils.V_RE.test(chars[i])) {
        s += chars[i];
        i++;
      }

      // 2) núcleo vocálico: pelo menos 1 vogal
      if (i < chars.length && Utils.V_RE.test(chars[i])) {
        s += chars[i];
        // VV: decide hiato x ditongo
        while(i + 1 < chars.length && Utils.V_RE.test(chars[i+1])) {
          if (Syllabifier.isHiato(w, i)) break; // pausa: próximo verso começa na próxima vogal
          i++;
          s += chars[i];
        }
        i++; // consumiu a última vogal do núcleo
      } else {
        // palavra sem vogal restante (raro/abreviação): fecha sílaba e segue
        syl.push(s); 
        continue;
      }

      // 3) coda/onset seguinte: olhar bloco consonantal após o núcleo
      let j = i;
      while(j < chars.length && !Utils.V_RE.test(chars[j])) j++;
      const cons = chars.slice(i, j).join(""); // cluster consonantal entre i..j-1

      if (cons.length === 0) {
        // V (fim da palavra ou outra vogal já tratada)
        syl.push(s);
        i = j;
        continue;
      }

      if (cons.length === 1) {
        // V C V → V - CV  (consoante vira onset da próxima)
        syl.push(s);
        carryOnset = cons;           // segura para próxima sílaba
        i = j;                        // pula a consoante
        continue;
      }

      // cons.length >= 2
      // Regra padrão: VCCV → VC-CV
      // Se as duas últimas formam onset válido (ex.: "tr","br","pl"), preferir VC-CCV
      const last2 = cons.slice(-2).toLowerCase();
      if (Utils.ONSETS.includes(last2)) {
        const coda = cons.slice(0, cons.length - 2);
        s += coda;                   // coda fica na sílaba atual
        syl.push(s);
        carryOnset = cons.slice(-2); // onset válido da próxima
        i = j;                       // consumiu o cluster todo
      } else {
        // VC-CV: tudo menos a última fica como coda
        const coda = cons.slice(0, cons.length - 1);
        s += coda;
        syl.push(s);
        carryOnset = cons.slice(-1); // última consoante vai pro onset da próxima
        i = j;
      }
    }

    // remove vazias, repõe dígrafos
    const out = syl.filter(Boolean).map(Utils.unprotectDigraphs);

    // 4) segurança extra: hiatos dentro da mesma sílaba (caso escape)
    return Syllabifier.splitHiatosPost(Utils.norm(raw), out);
  }

  static splitHiatosPost(word, syls){
    // Varre pares VV e garante um corte entre eles quando isHiato=true
    let out = [...syls];
    const w = Utils.norm(word);
    if (out.join("") !== w) return syls; // proteção

    // mapa de bordas sílabas → índices em chars
    let offset = 0;
    for (let k = 0; k < out.length; k++){
      const s = out[k];
      for (let t = 0; t < s.length - 1; t++){
        const i = offset + t;
        if (Utils.V_RE.test(w[i]) && Utils.V_RE.test(w[i+1]) && Syllabifier.isHiato(w, i)){
          // corta dentro desta sílaba em t+1
          const left = s.slice(0, t+1), right = s.slice(t+1);
          out.splice(k, 1, left, right);
          return Syllabifier.splitHiatosPost(word, out); // reprocessa até estabilizar
        }
      }
      offset += s.length;
    }
    return out;
  }
}
