export const isValidName = (name: string): string | null => {
  if (!name || name.trim() === "") {
    return "Name cannot be empty.";
  }

  const minLength = 3;
  const maxLength = 30;

  if (name.length < minLength || name.length > maxLength) {
    return `Name must be between ${minLength} and ${maxLength} characters.`;
  }

  const validNameRegex = /^[a-zA-Z0-9 ]+$/;

  if (!validNameRegex.test(name)) {
    return "Name can only contain letters, numbers, and spaces.";
  }

  return null;
};
