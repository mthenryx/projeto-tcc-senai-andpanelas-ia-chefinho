// Limita um texto a um número máximo de caracteres (contados como o banco conta: por caractere, não por byte).
// Se passar do limite, corta no fim de uma frase ou, na falta dela, no fim de uma palavra,
// para não deixar a resposta cortada no meio. O texto nunca ultrapassa o máximo.
export function limitarTexto(texto: string, maximo: number): string {
  if (Array.from(texto).length <= maximo) return texto;

  const prefixo = Array.from(texto).slice(0, maximo).join("");
  const minimo = prefixo.length * 0.5; // só corta fora do começo se sobrar um pedaço razoável

  const fimFrase = Math.max(
    prefixo.lastIndexOf(". "),
    prefixo.lastIndexOf("! "),
    prefixo.lastIndexOf("? "),
    prefixo.lastIndexOf("\n")
  );
  if (fimFrase >= minimo) return prefixo.slice(0, fimFrase + 1).trimEnd();

  const espaco = prefixo.lastIndexOf(" ");
  if (espaco >= minimo) return prefixo.slice(0, espaco).trimEnd();

  return prefixo.trimEnd();
}

// Garante que a tag comece com exatamente um "#" (ex.: "frango" -> "#frango", "##frango" -> "#frango")
export function comHashtag(tag: string): string {
  return `#${tag.trim().replace(/^#+/, "")}`;
}