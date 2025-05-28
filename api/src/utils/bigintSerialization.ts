/**
 * Converts BigInt values to strings for JSON serialization
 * @param obj Object that may contain BigInt values
 * @returns Object with BigInt values converted to strings
 */
export const serializeBigInt = <T extends Record<string, any>>(obj: T): T => {
  const result = { ...obj }

  for (const key in result) {
    if (typeof result[key] === 'bigint') {
      result[key] = result[key].toString() as any
    }
  }

  return result
}

/**
 * Converts multiple objects with BigInt values to strings for JSON serialization
 * @param objects Array of objects that may contain BigInt values
 * @returns Array of objects with BigInt values converted to strings
 */
export const serializeBigIntArray = <T extends Record<string, any>>(objects: T[]): T[] => {
  return objects.map(obj => serializeBigInt(obj))
}
