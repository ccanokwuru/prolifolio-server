const average = (array: number[]) =>
  array.reduce((a, b) => a + b, 0) / array.length;

export default average;
