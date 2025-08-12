import { Utils } from "./utils.js";
import { Syllabifier } from "./syllabifier.js";
import { Sinalefa } from "./sinalefa.js";

export class Prosody {
  static stressBackOffset(word){
    const syl=Syllabifier.syllabifyWord(word); if(!syl.length) return 0;
    const joined=syl.join(""); let idx=-1;
    for(let i=[...joined].length-1;i>=0;i--) if(/[áéíóúâêôãõ]/.test(joined[i])){ idx=i; break; }
    if(idx!==-1){
      let accSyl=0,pos=-1;
      for(let i=0;i<syl.length;i++){ pos+=syl[i].length; if(pos>=idx){ accSyl=i; break; } }
      return (syl.length-1)-accSyl;
    }
    if(/(a|e|o|as|es|os|am|em|ens)$/.test(word)) return 1;
    return 0;
  }

  static rhymeKey(line){
    const ws = Utils.tokens(line); if(!ws.length) return "";
    const last = ws[ws.length-1];
    const syl  = Syllabifier.syllabifyWord(last); if(!syl.length) return "";
    const back = Prosody.stressBackOffset(last);
    const idx  = syl.length-1-back;
    // pega da sílaba tônica em diante, mas remove consoantes iniciais antes da 1ª vogal
    let key = syl.slice(idx).join("");
    key = key.replace(/^[^aeiouáâãàéêíóôúõ]+/i, ""); // remove ataque consonantal
    key = Utils.stripAccents(key).toLowerCase();
    return key;
  }

  static scanLine(line){
    const ws=Utils.tokens(line);
    if(!ws.length) return {count:0, fused:[], plainSyl:[], viewSyl:[], stresses:[]};
    const fused = Sinalefa.apply(ws);
    const { plainSyl, viewSyl } = Sinalefa.mergeForView(fused);

    const stresses=[]; let cursor=0;
    for(const w of fused){
      if(w.includes("~")){
        const [a,b]=w.split("~"), sa=Syllabifier.syllabifyWord(a), sb=Syllabifier.syllabifyWord(b);
        const backA=Prosody.stressBackOffset(a); const idxA=sa.length-1-backA;
        if(idxA>=0) stresses.push(cursor+idxA+1);
        const backB=Prosody.stressBackOffset(b); const idxB=sb.length-1-backB;
        if(idxB===0) stresses.push(cursor+sa.length);
        else if(idxB>0) stresses.push(cursor+sa.length+idxB);
        cursor += sa.length + (sb.length-1);
      }else{
        const s=Syllabifier.syllabifyWord(w); const back=Prosody.stressBackOffset(w); const idx=s.length-1-back;
        if(idx>=0) stresses.push(cursor+idx+1);
        cursor += s.length;
      }
    }

    const backLast=Prosody.stressBackOffset(ws[ws.length-1]);
    const poetic = Math.max(1, plainSyl.length - backLast);
    const stressesCut = stresses.filter(p=>p<=poetic);

    return { count:poetic, fused, plainSyl, viewSyl, stresses:stressesCut };
  }

  static coincidence(found,target){
    const set=new Set(found); let m=0; target.forEach(t=>{ if(set.has(t)) m++; });
    return Math.round((m/target.length)*100);
  }

  static patternLine(name, positions, notation, stresses){
    const coinc = Prosody.coincidence(stresses, positions);
    return `(verso ${name} [${positions.join(",")}][${notation}], coincidência ${coinc}%).`;
  }
  static peonio(stresses){ return Prosody.patternLine("peonio (de segunda)", [2,6,10], "∪–∪∪", stresses); }
  static jonicoMaior(stresses){ return Prosody.patternLine("jónico maior", [1,2,5,6,9,10], "––∪∪", stresses); }
}
