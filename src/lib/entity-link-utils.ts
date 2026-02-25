export function addUnique(values: string[], id: string): string[] {
  return values.includes(id) ? values : [...values, id];
}

export function equalSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const setA = new Set(a);
  if (setA.size !== new Set(b).size) {
    return false;
  }

  for (const value of b) {
    if (!setA.has(value)) {
      return false;
    }
  }

  return true;
}
