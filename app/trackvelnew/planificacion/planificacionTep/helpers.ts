export function findItem(
    groups: Record<string, { id: string; name: string; district: string; address: string }[]>,
    itemId: string
  ): [string | null, number | null] {
    for (const groupKey in groups) {
      const index = groups[groupKey].findIndex((item) => item.id === itemId);
      if (index !== -1) {
        return [groupKey, index];
      }
    }
    return [null, null];
  }