import { CellDep } from "@ckb-lumos/lumos";

export function mergeArraysAndRemoveDuplicates(
  arr1: CellDep[],
  arr2: CellDep[]
) {
  const mergedArray = [...arr1, ...arr2];
  const uniqueArray = mergedArray.reduce((acc: CellDep[], currentValue) => {
    const isDuplicate = acc.some(
      (item: CellDep) =>
        item.outPoint.txHash === currentValue.outPoint.txHash &&
        item.outPoint.index === currentValue.outPoint.index
    );
    if (!isDuplicate) {
      acc.push(currentValue);
    }
    return acc;
  }, []);
  return uniqueArray;
}
