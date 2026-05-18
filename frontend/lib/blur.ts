export function shouldBlur(
  sexual: number, violence: number,
  sexualLevel: string, violenceLevel: string
): boolean {
  const isSexual = (sexualLevel === "safe" && sexual > 0.5) || (sexualLevel === "suggestive" && sexual > 1.5)
  const isViolent = (violenceLevel === "tame" && violence > 0.5) || (violenceLevel === "violent" && violence > 1.5)
  return isSexual || isViolent
}
