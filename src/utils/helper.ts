
export function truncateText(value: string, max = 72) {
  const text = value.trim();
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}


export function getDisplayName(name?: string | null): string {
  if (!name) {
    return "User";
  }

  return name.length > 6 ? name.slice(0, 6) : name;
}

