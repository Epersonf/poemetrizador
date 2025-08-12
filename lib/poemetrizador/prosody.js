import { Utils } from "./utils.js";
import { Syllabifier } from "./syllabifier.js";
import { Sinalefa } from "./sinalefa.js";

export class Prosody {
  static stressBackOffset(word) {
    const syl = Syllabifier.syllabifyWord(word); if (!syl.length) return 0;
    const joined = syl.join(""); let idx = -1;
    for (let i = [...joined].length - 1; i >= 0; i--) {
      if (/[áéíóúâêôãõ]/.test(joined[i])) { idx = i; break; }
    }
    if (idx !== -1) {
      let accSyl = 0, pos = -1;
      for (let i = 0; i < syl.length; i++) { pos += syl[i].length; if (pos >= idx) { accSyl = i; break; } }
      return (syl.length - 1) - accSyl;
    }
    if (/(a|e|o|as|es|os|am|em|ens)$/.test(word)) return 1;
    return 0;
  }

  static rhymeKey(line) {
    const ws = Utils.tokens(line); if (!ws.length) return "";
    const last = ws[ws.length - 1];
    const syl = Syllabifier.syllabifyWord(last); if (!syl.length) return "";
    const back = Prosody.stressBackOffset(last);
    const idx = syl.length - 1 - back;
    // pega da sílaba tônica em diante, mas remove consoantes iniciais antes da 1ª vogal
    let key = syl.slice(idx).join("");
    key = key.replace(/^[^aeiouáâãàéêíóôúõ]+/i, ""); // remove ataque consonantal
    key = Utils.stripAccents(key).toLowerCase();
    return key;
  }

  static scanLine(line) {
    const ws = Utils.tokens(line);
    if (!ws.length) return { count: 0, fused: [], plainSyl: [], viewSyl: [], stresses: [] };

    // aplica sinalefas e gera sílabas para contagem/visual
    const fused = Sinalefa.apply(ws);
    const { plainSyl, viewSyl } = Sinalefa.mergeForView(fused);

    const stresses = [];
    let cursor = 0;                 // posição silábica corrente (1-based no push)
    const wordEnds = [];            // ranges por palavra após sinalefa: { w, start, end }

    for (const w of fused) {
      if (!w.includes("~")) {
        // palavra simples
        const syls = Syllabifier.syllabifyWord(w);
        const back = Prosody.stressBackOffset(w);
        const idx = syls.length - 1 - back;
        if (idx >= 0) stresses.push(cursor + idx + 1);

        wordEnds.push({ w, start: cursor + 1, end: cursor + syls.length });
        cursor += syls.length;
        continue;
      }

      // === cadeia fundida: a~b~c...
      const parts = w.split("~");
      const sylParts = parts.map(p => Syllabifier.syllabifyWord(p));

      // total de sílabas contribuídas pela cadeia:
      // len(a) + sum(len(pk) - 1) (cada subsequente compartilha a 1ª sílaba)
      let accLen = 0;

      // parte 0 (sem compartilhamento prévio)
      {
        const p = parts[0];
        const s = sylParts[0];
        const back = Prosody.stressBackOffset(p);
        const idx = s.length - 1 - back;
        if (idx >= 0) stresses.push(cursor + idx + 1);

        wordEnds.push({ w: p, start: cursor + 1, end: cursor + s.length });
        accLen = s.length;
      }

      // partes 1..n-1 (cada uma compartilha sua 1ª sílaba)
      for (let k = 1; k < parts.length; k++) {
        const p = parts[k];
        const s = sylParts[k];
        const back = Prosody.stressBackOffset(p);
        const idx = s.length - 1 - back;

        // acento na sílaba compartilhada (idx === 0)
        if (idx === 0) {
          stresses.push(cursor + accLen);
        } else if (idx > 0) {
          stresses.push(cursor + accLen + idx);
        }

        // range da palavra: começa na compartilhada e termina após (len-1) adicionadas
        const start = cursor + accLen;
        const end = start + (s.length - 1);
        wordEnds.push({ w: p, start, end });

        accLen += (s.length - 1);
      }

      // avança cursor global pela contribuição da cadeia
      cursor += accLen;
    }

    // contagem poética (corta as átonas pós-tônica finais)
    const backLast = Prosody.stressBackOffset(ws[ws.length - 1]);
    const poetic = Math.max(1, plainSyl.length - backLast);
    let stressesCut = stresses.filter(p => p <= poetic);

    // cadência: verso oxítono → garantir acento na última sílaba
    if (backLast === 0 && !stressesCut.includes(poetic)) {
      stressesCut.push(poetic);
    }

    // clítico(s) pré-oxítona: acento no fim do último artigo da cadeia (a/o/as/os)
    for (let i = 0; i < wordEnds.length - 1; i++) {
      const isArt = Utils.isArticleMonosyllable(wordEnds[i].w);
      if (!isArt) continue;

      // agrupa artigos contíguos
      let j = i;
      while (j < wordEnds.length && Utils.isArticleMonosyllable(wordEnds[j].w)) j++;

      // j aponta para a 1ª não-artigo
      const isLastWord = (j === wordEnds.length - 1);
      if (!isLastWord) { i = j - 1; continue; }

      const nextWord = wordEnds[j].w;
      const nextStartsWithVowel = /^[h]?[aeiouáâãàéêíóôúõ]/i.test(Utils.norm(nextWord));
      const nextIsOxytone = (Prosody.stressBackOffset(nextWord) === 0);

      // aplica somente se houver contato vocálico e a última palavra for oxítona
      if (nextStartsWithVowel && nextIsOxytone) {
        const firstArt = wordEnds[i];
        const pos = Math.min(firstArt.end, poetic);
        if (!stressesCut.includes(pos)) stressesCut.push(pos);
      }

      i = j - 1; // salta a cadeia já tratada
    }

    // ordenar e deduplicar
    stressesCut = [...new Set(stressesCut)].sort((a, b) => a - b);

    return { count: poetic, fused, plainSyl, viewSyl, stresses: stressesCut };
  }
}
