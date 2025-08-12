// Poemetrizador — separação silábica PT-BR com sinalefa + métrica básica

// ===== Núcleo heurístico =====
const V = "aáâãàeéêiíoóôuúõ";
const V_RE = new RegExp(`[${V}]`, "i");
const DIGRAPHS = ["ch","lh","nh","gu","qu"];
const ONSETS = ["br","cr","dr","fr","gr","pr","tr","vr","bl","cl","fl","gl","pl"];

const norm = s => s.normalize("NFC").toLowerCase().replace(/\u200B/g,"");
const tokens = line => norm(line).match(/[a-záâãàéêíóôúõç]+(?:[-’'][a-záâãàéêíóôúõç]+)*/gi) ?? [];
const protectDigraphs  = s => DIGRAPHS.reduce((r,d)=>r.replaceAll(d,d.toUpperCase()), s);
const unprotectDigraphs= s => DIGRAPHS.reduce((r,d)=>r.replaceAll(d.toUpperCase(), d), s);

// Heurística hiato x ditongo
function isHiato(word, i){ // corte entre i e i+1
  const a = word[i], b = word[i+1];
  const pair = a + b;
  const ditongos = ["ai","ei","oi","au","eu","ou","ui","iu","ãe","ão","õe"];
  if (ditongos.includes(pair)) return false;
  const hiatos = ["ua","uo","ia","io","eo","oa","oo","ee","ii","uu"];
  if (hiatos.includes(pair)) {
    if (i>=1 && word[i-1]==="u" && (word[i-2]==="q" || word[i-2]==="g")) return false; // qua/gua/quo/guo
    return true;
  }
  return false;
}

function syllabifyWord(raw){
  let w = norm(raw); if(!w) return [];
  w = protectDigraphs(w);

  // 1) blocos V/C
  const chars=[...w], blocks=[]; let cur=chars[0]??"";
  for(let i=1;i<chars.length;i++){
    const a=chars[i-1], b=chars[i], ta=V_RE.test(a)?"V":"C", tb=V_RE.test(b)?"V":"C";
    if(ta===tb) cur+=b; else { blocks.push(cur); cur=b; }
  }
  if(cur) blocks.push(cur);
  for(let i=0;i<blocks.length;i++) if(/[A-Z]{2}/.test(blocks[i])) blocks[i]=blocks[i].toLowerCase();

  const syl=[]; let i=0; let buf="";
  while(i<blocks.length){
    const b=blocks[i]; buf+=b;
    const typeB = V_RE.test(b[0])?"V":"C";
    const next = blocks[i+1], after = blocks[i+2];

    if(typeB==="V"){
      // 2) hiatos dentro do bloco
      if(b.length>1){
        for(let k=0;k<b.length-1;k++){
          if(isHiato(w, w.indexOf(b)+k)){
            const left = buf.slice(0, buf.length - (b.length - (k+1)));
            if(left){ syl.push(left); }
            buf = b.slice(k+1);
          }
        }
      }
      // 3) distribuição de consoantes seguintes
      if(next && !V_RE.test(next[0])){
        if(!after || !V_RE.test(after[0])){ // sem vogal depois: vira coda
          syl.push(buf + next); buf=""; i+=2; continue;
        }
        const cc = next;
        if(cc.length===1){ syl.push(buf); buf=""; i+=1; }
        else{
          const tail = cc.slice(-1);
          if(ONSETS.includes(tail.toLowerCase())){
            syl.push(buf + cc.slice(0, cc.length-1)); buf=""; blocks[i+1]=tail;
          }else{
            syl.push(buf + cc.slice(0, cc.length-1)); buf=""; blocks[i+1]=cc.slice(cc.length-1);
          }
        }
      }else{
        syl.push(buf); buf="";
      }
    }else{
      if(i===blocks.length-1){ syl.push(buf); buf=""; }
    }
    i++;
  }
  const res = syl.filter(Boolean).map(unprotectDigraphs);
  return splitHiatosPost(norm(raw), res);
}

function splitHiatosPost(word, syls){
  let out=[...syls];
  const joined = syls.join("");
  if(joined!==norm(word)) return syls;
  for(let j=0;j<word.length-1;j++){
    if(V_RE.test(word[j]) && V_RE.test(word[j+1]) && isHiato(word,j)){
      // insere corte dentro da sílaba correspondente
      let cum=0, k=0; for(;k<out.length;k++){ cum+=out[k].length; if(cum>j) break; }
      const insideIdx = out[k].length - (cum - (j+1));
      if(insideIdx>0 && insideIdx<out[k].length){
        const left = out[k].slice(0,insideIdx), right = out[k].slice(insideIdx);
        out.splice(k,1,left,right);
      }
    }
  }
  return out;
}

// Sinalefa (V~V; h mudo ok; finais nasais bloqueiam)
function applySinalefa(words){
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

// stress: 0=última, 1=penúltima...
function stressBackOffset(word){
  const syl=syllabifyWord(word); if(!syl.length) return 0;
  const joined=syl.join(""); let idx=-1;
  for(let i=[...joined].length-1;i>=0;i--) if(/[áéíóúâêôãõ]/.test(joined[i])){ idx=i; break; }
  if(idx!==-1){
    let accSyl=0,pos=-1;
    for(let i=0;i<syl.length;i++){ pos+=syl[i].length; if(pos>=idx){ accSyl=i; break; } }
    return (syl.length-1)-accSyl;
  }
  if(/(a|e|o|as|es|os|am|em|ens)$/.test(word)) return 1; // paroxítona
  return 0; // oxítona
}

function mergeWithSinalefa(fusedWords){
  const plain=[], view=[];
  const vTail = s => (s.match(/[aeiouáéíóúâêôãõ]+$/i)||[""])[0];
  const vHead = s => (s.match(/^h?[aeiouáéíóúâêôãõ]+/i)||[""])[0];
  for(const w of fusedWords){
    if(!w.includes("~")){
      const s=syllabifyWord(w); plain.push(...s); view.push(...s); continue;
    }
    const [a,b]=w.split("~");
    const sa=syllabifyWord(a), sb=syllabifyWord(b);
    if(sa.length&&sb.length){
      const lastA=sa[sa.length-1], firstB=sb[0];
      plain.push(...sa.slice(0,-1), lastA+firstB, ...sb.slice(1));
      const tail=vTail(lastA), head=vHead(firstB);
      const lastAview = tail ? lastA.replace(new RegExp(`${escapeReg(tail)}$`,"i"), `<span class="sig">${tail}</span>`) : lastA;
      const firstBview = head ? firstB.replace(new RegExp(`^${escapeReg(head)}`,"i"), `<span class="sig">${head}</span>`) : firstB;
      view.push(...sa.slice(0,-1), lastAview+firstBview, ...sb.slice(1));
    }else{ plain.push(...sa,...sb); view.push(...sa,...sb); }
  }
  return { plainSyl: plain, viewSyl: view };
}

function scanLine(line){
  const ws=tokens(line);
  if(!ws.length) return {count:0, fused:[], plainSyl:[], viewSyl:[], stresses:[]};
  const fused = applySinalefa(ws);
  const { plainSyl, viewSyl } = mergeWithSinalefa(fused);

  // posições tônicas globais (1-based)
  const stresses=[]; let cursor=0;
  for(const w of fused){
    if(w.includes("~")){
      const [a,b]=w.split("~"), sa=syllabifyWord(a), sb=syllabifyWord(b);
      const backA=stressBackOffset(a); const idxA=sa.length-1-backA;
      if(idxA>=0) stresses.push(cursor+idxA+1);
      const backB=stressBackOffset(b); const idxB=sb.length-1-backB;
      if(idxB===0) stresses.push(cursor+sa.length);
      else if(idxB>0) stresses.push(cursor+sa.length+idxB);
      cursor += sa.length + (sb.length-1);
    }else{
      const s=syllabifyWord(w); const back=stressBackOffset(w); const idx=s.length-1-back;
      if(idx>=0) stresses.push(cursor+idx+1);
      cursor += s.length;
    }
  }

  const backLast=stressBackOffset(ws[ws.length-1]);
  const poetic = Math.max(1, plainSyl.length - backLast);
  const stressesCut = stresses.filter(p=>p<=poetic);

  return { count:poetic, fused, plainSyl, viewSyl, stresses:stressesCut };
}

function rhymeKey(line){
  const ws=tokens(line); if(!ws.length) return "";
  const last=ws[ws.length-1], syl=syllabifyWord(last); if(!syl.length) return "";
  const back=stressBackOffset(last), idx=syl.length-1-back;
  return syl.slice(idx).join("").replace(/[^\wáâãàéêíóôúõç]/g,"").replace(/^h/,"");
}

// ===== UI =====
const out = document.getElementById("out");
document.getElementById("btn").addEventListener("click", run);
document.getElementById("showNormal").addEventListener("change", run);
document.getElementById("showSinalefa").addEventListener("change", run);
run();

function run(){
  const text = document.getElementById("inp").value.replace(/\r/g,"");
  const showNormal = document.getElementById("showNormal").checked;
  const showSinalefa = document.getElementById("showSinalefa").checked;
  const lines = text.split("\n");
  const verses = lines.filter(l=>l.trim().length>0);

  const sections=[];

  if(showNormal){
    const rows = verses.map(line=>{
      const s=tokens(line).flatMap(w=>syllabifyWord(w));
      return `${s.join("-")}  🠒  (${s.length} sílabas)`;
    });
    sections.push(section("Separação normal", `<div class="mono">${rows.join("\n\n")}</div>`));
  }

  if(showSinalefa){
    const rows = verses.map(line=>{
      const sc=scanLine(line);
      const pretty=sc.viewSyl.join("-");
      const tot=sc.plainSyl.length;
      const det=(sc.count!==tot)?` [${sc.count} = ${tot}-${(tot-sc.count)}]`:"";
      const rhyme=rhymeKey(line)||"—";
      const ritmo=sc.stresses.sort((a,b)=>a-b).join(",");
      const coincide = coincidence(sc.stresses,[2,4,6,8,10]);
      return `${pretty}  🠒  (${sc.count} sílabas${det}, ritmo: ${ritmo}).\nRima com "${rhyme}".\n  (verso iâmbo ou acentos rítmicos [2,4,6,8,10][∪–], coincidência ${coincide}%).`;
    });
    sections.push(section("Com sinalefas", `<div class="mono">${rows.join("\n\n")}</div>`));
  }

  const syllCounts = verses.map(l=>scanLine(l).count);
  const blocks = chunkByBlank(lines).map(b=>{
    const ks=b.filter(l=>l.trim()).map(l=>rhymeKey(l));
    return schemeLetters(ks).join("");
  }).filter(Boolean);

  sections.push(section("Resultado final da análise poética",
`<div class="mono">Análise de estrofas (esquema métrico):
${blocks.join(" ")}
${syllCounts.join("-")}
Contém ${verses.length} versos.</div>`));

  out.replaceChildren(...sections);
}

// helpers
function coincidence(found,target){
  const set=new Set(found); let m=0; target.forEach(t=>{ if(set.has(t)) m++; });
  return Math.round((m/target.length)*100);
}
function section(title, inner){ const d=document.createElement("div"); d.className="sec"; d.innerHTML=`<h2>${title}</h2>${inner}`; return d; }
function schemeLetters(keys){ const map=new Map(); let next=0; const abc="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return keys.map(k=>{ if(!k) return ""; if(!map.has(k)) map.set(k, abc[next++]||"?"); return map.get(k); });
}
function chunkByBlank(lines){ const res=[]; let cur=[]; for(const l of lines){ if(l.trim()) cur.push(l); else { if(cur.length) res.push(cur), cur=[]; } } if(cur.length) res.push(cur); return res; }
function escapeReg(s){ return s.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&"); }
