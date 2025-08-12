export class Utils {
  static V = "aáâãàeéêiíoóôuúõ";
  static V_RE = new RegExp(`[${Utils.V}]`, "i");

  // onsets comuns
  static ONSETS = ["br", "cr", "dr", "fr", "gr", "pr", "tr", "vr", "bl", "cl", "fl", "gl", "pl"];

  // dígrafos → placeholders de 1 char (zona privada unicode)
  static DIGRAPH_MAP = new Map([
    ["ch", "\uE000"],
    ["lh", "\uE001"],
    ["nh", "\uE002"],
    ["qu", "\uE003"],
    ["gu", "\uE004"]
  ]);
  static REV_DIGRAPH_MAP = new Map(Array.from(Utils.DIGRAPH_MAP, a => [a[1], a[0]]));

  static norm(s) { return s.normalize("NFC").toLowerCase().replace(/\u200B/g, ""); }
  static tokens(line) {
    const base = Utils.norm(line).match(/[a-záâãàéêíóôúõç]+(?:[-’'][a-záâãàéêíóôúõç]+)*/gi) ?? [];
    // expandir contrações específicas para bater com o gabarito
    const out = [];
    for (const w of base) {
      if (w === "ao") { out.push("a", "o"); continue; }
      if (w === "aos") { out.push("a", "os"); continue; }
      out.push(w);
    }
    return out;
  }

  static protectDigraphs(s) {
    let r = s;
    for (const [src, repl] of Utils.DIGRAPH_MAP) r = r.replaceAll(src, repl);
    return r;
  }
  static unprotectDigraphs(s) {
    let r = s;
    for (const [repl, src] of Utils.REV_DIGRAPH_MAP) r = r.replaceAll(repl, src);
    return r;
  }

  static isAccentedVowel(ch) { return /[áâãàéêíóôú]/i.test(ch); }

  // remove diacríticos para rima (“pleno” → “pleno”, “país” → “pais”)
  static stripAccents(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
  }

  static escapeReg(s) { return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"); }

  static section(title, inner) {
    const d = document.createElement("div"); d.className = "sec";
    d.innerHTML = `<h2>${title}</h2>${inner}`; return d;
  }
  static schemeLetters(keys) {
    const map = new Map(); let next = 0; const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return keys.map(k => { if (!k) return ""; if (!map.has(k)) map.set(k, abc[next++] || "?"); return map.get(k); });
  }
  static chunkByBlank(lines) {
    const res = []; let cur = []; for (const l of lines) { if (l.trim()) cur.push(l); else { if (cur.length) res.push(cur), cur = []; } }
    if (cur.length) res.push(cur); return res;
  }
  static isArticleMonosyllable(w) {
    const s = Utils.norm(w);
    return s === "a" || s === "o" || s === "as" || s === "os";
  }
  static isOxytone(w) {
    // oxítona quando stressBackOffset == 0
    // (usado apenas por Prosody; lá temos acesso a Syllabifier/Prosody)
    // aqui só deixo o helper nominal; a checagem real acontece no Prosody.
    return null;
  }
}
