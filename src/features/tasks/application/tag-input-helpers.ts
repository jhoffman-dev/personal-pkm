export function appendUniqueTag(
  tags: string[],
  tagInput: string,
): { nextTags: string[]; nextTagInput: string } {
  const value = tagInput.trim();
  if (!value) {
    return {
      nextTags: tags,
      nextTagInput: "",
    };
  }

  const exists = tags.some((tag) => tag.toLowerCase() === value.toLowerCase());

  return {
    nextTags: exists ? tags : [...tags, value],
    nextTagInput: "",
  };
}
