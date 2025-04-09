import { Abi, AbiFunction, AbiParameter } from "viem";

// Define a type that explicitly includes components for tuple types
type AbiParameterWithComponents = AbiParameter & {
  components?: readonly AbiParameterWithComponents[];
};

// Extended type with additional metadata for linearized parameters
export type LinearizedParameter = AbiParameter & {
  path?: string;               // The parent path of this parameter
  originalType?: string;       // Original type before processing
  isElementOfArray?: boolean;  // Whether this element is part of an array
  arrayDepth?: number;         // Nesting level for arrays (tuple[][], etc.)
};

/**
 * Converts a tuple type to a more descriptive representation including parameter names
 * For example: "tuple" -> "(uint256 a, string b)"
 * or "tuple[]" -> "(uint256 a, (string b, bytes c))[]"
 */
const formatTupleType = (input: AbiParameterWithComponents): string => {
  if (!input.type.includes('tuple') || !input.components) {
    return input.type;
  }

  // Create a string representation of tuple components with their names
  const componentsStr = input.components
    .map((comp, index) => {
      const paramName = comp.name || `param${index}`;

      if (comp.type.includes('tuple') && comp.components) {
        // Recursively format nested tuples
        const formattedTuple = formatTupleType(comp);
        return `${formattedTuple} ${paramName}`;
      }

      // For regular types, include type and name
      return `${comp.type} ${paramName}`;
    })
    .join(', ');

  // Format as (components) for tuple or (components)[] for tuple arrays
  if (input.type === 'tuple') {
    return `(${componentsStr})`;
  } else {
    // Handle tuple[], tuple[][], etc.
    const arrayPart = input.type.substring(5); // extract the [] part
    return `(${componentsStr})${arrayPart}`;
  }
};

/**
 * Linearizes an ABI function's parameters, treating tuple types as single elements
 * without expanding their inner components. Also transforms tuple types to a more
 * descriptive representation including parameter names.
 * 
 * Example:
 * Input ABI with nested tuples:
 * {
 *   inputs: [
 *     { type: "uint256", name: "simpleParam" },
 *     { 
 *       type: "tuple", 
 *       name: "simpleTuple", 
 *       components: [
 *         { type: "uint256", name: "a" }, 
 *         { type: "string", name: "b" }
 *       ]  
 *     },
 *     { 
 *       type: "tuple[]", 
 *       name: "tupleArray", 
 *       components: [
 *         { type: "uint256", name: "a" },
 *         { 
 *           type: "tuple", 
 *           name: "nestedTuple", 
 *           components: [
 *             { type: "string", name: "b" }, 
 *             { type: "bytes", name: "c" }
 *           ] 
 *         }
 *       ] 
 *     }
 *   ]
 * }
 * 
 * This would be linearized with transformed types, e.g.:
 * - "tuple" becomes "(uint256 a, string b)"
 * - "tuple[]" becomes "(uint256 a, (string b, bytes c) nestedTuple)[]"
 */
export const linearizeAbi = (abi: AbiFunction) => {
  const linearized: LinearizedParameter[] = [];

  // Process function inputs without expanding nested tuples
  const processInputs = (
    inputs: readonly AbiParameterWithComponents[],
    prefix = "",
    isInArray = false,
    arrayDepth = 0
  ) => {
    inputs.forEach((input, index) => {
      const paramName = input.name || `param${index}`;
      const fullPath = prefix + paramName;

      // Handle all types including tuples
      const isArray = input.type.includes('[');
      const currentArrayDepth = isArray
        ? (input.type.match(/\[\]/g) || []).length + arrayDepth
        : arrayDepth;

      // Transform tuple types
      const transformedType = input.type.includes('tuple')
        ? formatTupleType(input)
        : input.type;

      // Add the parameter to linearized array
      linearized.push({
        ...input,
        type: transformedType, // Use the transformed type
        name: fullPath,
        path: prefix,
        originalType: input.type,
        isElementOfArray: isInArray || isArray,
        arrayDepth: currentArrayDepth
      });

      // Note: We no longer recursively process tuple components
    });
  };

  // Start processing from the function inputs
  if (abi.inputs) {
    processInputs(abi.inputs as AbiParameterWithComponents[]);
  }

  console.log('linearized', linearized);
  return linearized;
};
