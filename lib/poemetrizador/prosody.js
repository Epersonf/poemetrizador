import { Utils } from "./utils.js";
import { Syllabifier } from "./syllabifier.js";
import { Sinalefa } from "./sinalefa.js";

export class Prosody {
  static stressBackOffset(word) {
    const syl = Syllabifier.syllabifyWord(word); if (!syl.length) return 0;
    const joined = syl.join(""); let idx = -1;
    for (let i = [...joined].length - 1; i >= 0; i--) if (/[áéíóúâêôãõ]/.test(joined[i])) { idx = i; break; }
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
      if (w.includes("~")) {
        const [a, b] = w.split("~");
        const sa = Syllabifier.syllabifyWord(a);
        const sb = Syllabifier.syllabifyWord(b);

        // acento de 'a'
        const backA = Prosody.stressBackOffset(a);
        const idxA = sa.length - 1 - backA;
        if (idxA >= 0) stresses.push(cursor + idxA + 1);

        // acento de 'b' (compartilha 1 sílaba com 'a' por causa da sinalefa)
        const backB = Prosody.stressBackOffset(b);
        const idxB = sb.length - 1 - backB;
        if (idxB === 0) stresses.push(cursor + sa.length);            // tônica na 1ª sílaba de b (que é a mesma sílaba compartilhada)
        else if (idxB > 0) stresses.push(cursor + sa.length + idxB);     // deslocada contando o compartilhamento

        // ranges por palavra
        wordEnds.push({ w: a, start: cursor + 1, end: cursor + sa.length });
        wordEnds.push({ w: b, start: cursor + sa.length, end: cursor + sa.length + sb.length - 1 });

        cursor += sa.length + (sb.length - 1); // -1 por conta da fusão
      } else {
        const s = Syllabifier.syllabifyWord(w);
        const back = Prosody.stressBackOffset(w);
        const idx = s.length - 1 - back;
        if (idx >= 0) stresses.push(cursor + idx + 1);

        wordEnds.push({ w, start: cursor + 1, end: cursor + s.length });
        cursor += s.length;
      }
    }

    // contagem poética (corta as átonas pós-tônica finais)
    const backLast = Prosody.stressBackOffset(ws[ws.length - 1]);
    const poetic = Math.max(1, plainSyl.length - backLast);
    let stressesCut = stresses.filter(p => p <= poetic);

    // cadência: verso oxítono → garantir acento na última sílaba
    if (backLast === 0 && !stressesCut.includes(poetic)) {
      stressesCut.push(poetic);
    }

    // clítico(s) pré-oxítona: acento no FIM do ÚLTIMO artigo da cadeia (a/o/as/os)
    for (let i = 0; i < wordEnds.length - 1; i++) {
      if (!Utils.isArticleMonosyllable(wordEnds[i].w)) continue;

      let j = i;
      // agrupa cadeia de artigos consecutivos
      while (j < wordEnds.length && Utils.isArticleMonosyllable(wordEnds[j].w)) j++;

      // j aponta para a 1ª palavra não-artigo após a cadeia
      const isLastWord = (j === wordEnds.length - 1); // oxítona deve ser a última do verso
      if (isLastWord && Prosody.stressBackOffset(wordEnds[j].w) === 0) {
        const firstArt = wordEnds[i];                  // 1º artigo da cadeia
        const pos = Math.min(firstArt.end, poetic);    // fim do 1º artigo
        if (!stressesCut.includes(pos)) stressesCut.push(pos);
      }

      i = j - 1; // pula a cadeia tratada
    }

    // ordenar e deduplicar
    stressesCut = [...new Set(stressesCut)].sort((a, b) => a - b);

    return { count: poetic, fused, plainSyl, viewSyl, stresses: stressesCut };
  }

  static coincidence(found, target) {
    const set = new Set(found); let m = 0; target.forEach(t => { if (set.has(t)) m++; });
    return Math.round((m / target.length) * 100);
  }

  static patternLine(name, positions, notation, stresses) {
    const coinc = Prosody.coincidence(stresses, positions);
    return `(verso ${name} [${positions.join(",")}][${notation}], coincidência ${coinc}%).`;
  }
  static peonio(stresses) { return Prosody.patternLine("peonio (de segunda)", [2, 6, 10], "∪–∪∪", stresses); }
  static jonicoMaior(stresses) { return Prosody.patternLine("jónico maior", [1, 2, 5, 6, 9, 10], "––∪∪", stresses); }
}
