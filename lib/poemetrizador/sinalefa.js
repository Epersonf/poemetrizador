// sinalefa.js
import { Utils } from "./utils.js";
import { Syllabifier } from "./syllabifier.js";

export class Sinalefa {
  static canFuse(prev, next){
    const a = Utils.norm(prev), b = Utils.norm(next);
    const endsWithVowel = /[aeiouáâãàéêíóôúõ]$/.test(a);
    const startsWithVowel = /^[h]?[aeiouáâãàéêíóôúõ]/.test(b);
    if (!endsWithVowel || !startsWithVowel) return false;

    // bloqueios
    const last = a.slice(-1);
    const first = b[0];
    const blockAccent = /[áâãàéêíóôú]/.test(last) || /[áâãàéêíóôú]/.test(first);
    const endsNasal = /(m|n|ns)$/.test(a);
    const blockAO = (a === "a") && /^o(s)?$/.test(b);
    if (blockAccent || endsNasal || blockAO) return false;

    return true;
  }

  static apply(words){
    const fused = [];
    for (let i = 0; i < words.length; ) {
      let acc = words[i];
      let j = i + 1;

      // permite sinalefas em CADEIA: acc ~ w[j] ~ w[j+1] ...
      while (j < words.length) {
        const lastPart = acc.includes("~") ? acc.split("~").pop() : acc;
        if (!Sinalefa.canFuse(lastPart, words[j])) break;
        acc = acc + "~" + words[j];
        j++;
      }

      fused.push(acc);
      i = j; // salta tudo que foi fundido
    }
    return fused;
  }

  static mergeForView(fusedWords){
    const plain=[], view=[];
    const vTail = s => (s.match(/[aeiouáéíóúâêôãõ]+$/i)||[""])[0];
    const vHead = s => (s.match(/^h?[aeiouáéíóúâêôãõ]+/i)||[""])[0];

    for (const w of fusedWords){
      if (!w.includes("~")){
        const s=Syllabifier.syllabifyWord(w); plain.push(...s); view.push(...s); continue;
      }
      const parts = w.split("~");
      // syllabify todas as palavras da cadeia
      const syls = parts.map(p => Syllabifier.syllabifyWord(p));

      // começa com sílabas da 1ª palavra
      let curPlain = syls[0].slice();
      let curView  = syls[0].slice();

      for (let k=1;k<parts.length;k++){
        const sa = curPlain;                // sílabas acumuladas até agora
        const sb = syls[k];                 // sílabas da próxima palavra
        if (sa.length && sb.length){
          const lastA = sa[sa.length-1];
          const firstB = sb[0];

          // junta a última de A com a primeira de B
          const fusedPlain = lastA + firstB;
          const tail=vTail(lastA), head=vHead(firstB);
          const lastAview = tail ? lastA.replace(new RegExp(`${Utils.escapeReg(tail)}$`,"i"), `<span class="sig">${tail}</span>`) : lastA;
          const firstBview = head ? firstB.replace(new RegExp(`^${Utils.escapeReg(head)}`,"i"), `<span class="sig">${head}</span>`) : firstB;
          const fusedView = lastAview + firstBview;

          // atualiza acumulado
          curPlain = [...sa.slice(0,-1), fusedPlain, ...sb.slice(1)];
          curView  = [...curView.slice(0,-1), fusedView,  ...sb.slice(1)];
        } else {
          curPlain = [...curPlain, ...sb];
          curView  = [...curView,  ...sb];
        }
      }

      plain.push(...curPlain);
      view.push(...curView);
    }
    return { plainSyl: plain, viewSyl: view };
  }
}
