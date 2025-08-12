import { Poemetrizador } from "./lib/poemetrizador/index.js";
const { Utils, Analyzer } = Poemetrizador;

const out = document.getElementById("out");
document.getElementById("btn").addEventListener("click", run);
document.getElementById("showNormal").addEventListener("change", run);
document.getElementById("showSinalefa").addEventListener("change", run);
run();

function run(){
  const text = document.getElementById("inp").value;
  const showNormal = document.getElementById("showNormal").checked;
  const showSinalefa = document.getElementById("showSinalefa").checked;

  const { normalRows, sinalRows, summaryHTML, lines } = Analyzer.analyze(text);

  const sections=[];
  if(showNormal){
    sections.push(Utils.section("Separação normal", `<div class="mono">${normalRows.join("\n\n")}</div>`));
  }
  if(showSinalefa){
    sections.push(Utils.section("Com sinalefas", `<div class="mono">${sinalRows.join("\n\n")}</div>`));
  }
  sections.push(Utils.section("Resultado final da análise poética", summaryHTML));
  out.replaceChildren(...sections);
}
