// Counts the number of changes made
export const countNumberOfChanges = (array1: string[], array2: string[]) => {
  const set2 = new Set(array2);
  const uniqueInArray1 = array1.filter((item) => !set2.has(item));
  const uniqueSet = new Set(uniqueInArray1);
  return uniqueSet.size;
};
