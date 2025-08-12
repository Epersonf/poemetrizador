export class Utils {
  static V = "aáâãàeéêiíoóôuúõ";
  static V_RE = new RegExp(`[${Utils.V}]`, "i");
  static DIGRAPHS = ["ch","lh","nh","gu","qu"];
  static ONSETS = ["br","cr","dr","fr","gr","pr","tr","vr","bl","cl","fl","gl","pl"];

  static norm(s){ return s.normalize("NFC").toLowerCase().replace(/\u200B/g,""); }
  static tokens(line){
    return Utils.norm(line).match(/[a-záâãàéêíóôúõç]+(?:[-’'][a-záâãàéêíóôúõç]+)*/gi) ?? [];
  }
  static protectDigraphs(s){ return Utils.DIGRAPHS.reduce((r,d)=>r.replaceAll(d,d.toUpperCase()), s); }
  static unprotectDigraphs(s){ return Utils.DIGRAPHS.reduce((r,d)=>r.replaceAll(d.toUpperCase(), d), s); }
  static escapeReg(s){ return s.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&"); }

  static section(title, inner){
    const d=document.createElement("div"); d.className="sec";
    d.innerHTML=`<h2>${title}</h2>${inner}`; return d;
  }
  static schemeLetters(keys){
    const map=new Map(); let next=0; const abc="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return keys.map(k=>{ if(!k) return ""; if(!map.has(k)) map.set(k, abc[next++]||"?"); return map.get(k); });
  }
  static chunkByBlank(lines){
    const res=[]; let cur=[]; for(const l of lines){ if(l.trim()) cur.push(l); else { if(cur.length) res.push(cur), cur=[]; } }
    if(cur.length) res.push(cur); return res;
  }
}
