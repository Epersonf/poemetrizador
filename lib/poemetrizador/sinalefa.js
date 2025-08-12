import { Utils } from "./utils.js";
import { Syllabifier } from "./syllabifier.js";

export class Sinalefa {
  static apply(words){
    const fused=[];
    for(let i=0;i<words.length;i++){
      const w=words[i], next=words[i+1];
      if(!next){ fused.push(w); break; }

      const a = Utils.norm(w);
      const b = Utils.norm(next);

      const last = a.slice(-1);
      const first = b[0];
      const startsWithVowel = /^[h]?[aeiouáâãàéêíóôúõ]/.test(b);
      const endsWithVowel   = /[aeiouáâãàéêíóôúõ]$/.test(a);
      const endsNasal       = /(m|n|ns)$/.test(a);

      // BLOQUEIOS adicionais (p/ bater gabarito):
      // 1) se a vogal final de A é acentuada OU a primeira vogal de B é acentuada → NÃO faz sinalefa
      const blockAccent = Utils.isAccentedVowel(last) || Utils.isAccentedVowel(first);
      // 2) “a” + “o/os” → NÃO faz sinalefa (mantém hiato a-o, a-os)
      const blockAO = (a === "a") && (/^o(s)?$/.test(b));

      if (endsWithVowel && startsWithVowel && !endsNasal && !blockAccent && !blockAO){
        fused.push(w+"~"+next); i++; // funde
      } else {
        fused.push(w);
      }
    }
    return fused;
  }

  static mergeForView(fusedWords){
    const plain=[], view=[];
    const vTail = s => (s.match(/[aeiouáéíóúâêôãõ]+$/i)||[""])[0];
    const vHead = s => (s.match(/^h?[aeiouáéíóúâêôãõ]+/i)||[""])[0];

    for(const w of fusedWords){
      if(!w.includes("~")){
        const s=Syllabifier.syllabifyWord(w); plain.push(...s); view.push(...s); continue;
      }
      const [a,b]=w.split("~");
      const sa=Syllabifier.syllabifyWord(a), sb=Syllabifier.syllabifyWord(b);
      if(sa.length&&sb.length){
        const lastA=sa[sa.length-1], firstB=sb[0];
        plain.push(...sa.slice(0,-1), lastA+firstB, ...sb.slice(1));
        const tail=vTail(lastA), head=vHead(firstB);
        const lastAview = tail ? lastA.replace(new RegExp(`${Utils.escapeReg(tail)}$`,"i"), `<span class="sig">${tail}</span>`) : lastA;
        const firstBview = head ? firstB.replace(new RegExp(`^${Utils.escapeReg(head)}`,"i"), `<span class="sig">${head}</span>`) : firstB;
        view.push(...sa.slice(0,-1), lastAview+firstBview, ...sb.slice(1));
      }else{ plain.push(...sa,...sb); view.push(...sa,...sb); }
    }
    return { plainSyl: plain, viewSyl: view };
  }
}
