import { Utils } from "./utils.js";
import { Syllabifier } from "./syllabifier.js";

export class Sinalefa {
  static apply(words){
    const fused=[];
    for(let i=0;i<words.length;i++){
      const w=words[i], next=words[i+1];
      if(!next){ fused.push(w); break; }
      const endV=/[aeiouáéíóúâêôãõ]$/.test(w);
      const endNasal=/(m|n|ns)$/.test(w);
      const startV=/^[h]?[aeiouáéíóúâêôãõ]/.test(next);
      if(endV && startV && !endNasal){ fused.push(w+"~"+next); i++; }
      else fused.push(w);
    }
    return fused;
  }

  // devolve sílabas mescladas e destacadas
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
