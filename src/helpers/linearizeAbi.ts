import { Abi, AbiFunction, AbiParameter } from "viem";

// Define a type that explicitly includes components for tuple types
type AbiParameterWithComponents = AbiParameter & {
  components?: readonly AbiParameterWithComponents[];
};

// Extended type to include depth information
export type LinearizedParameter = AbiParameter & {
  depth: number;
  path?: string;
};

export const linearizeAbi = (abi: AbiFunction) => {
  const linearized: LinearizedParameter[] = [];

  // Process function inputs to flatten nested tuples
  const processInputs = (
    inputs: readonly AbiParameterWithComponents[],
    prefix = "",
    depth = 0
  ) => {
    inputs.forEach((input, index) => {
      if (input.type === "tuple" || input.type.startsWith("tuple[")) {
        // For tuples, add the tuple itself with its depth
        linearized.push({
          ...input,
          name: prefix + (input.name || `param${index}`),
          depth,
          path: prefix
        });

        // Then recursively process the tuple's components
        if (input.components) {
          processInputs(
            input.components,
            prefix + (input.name ? input.name + "." : ""),
            depth + 1
          );
        }
      } else {
        // For non-tuple types, add to linearized array with proper name path and depth
        linearized.push({
          ...input,
          name: prefix + (input.name || `param${index}`),
          depth,
          path: prefix
        });
      }
    });
  };

  // Start processing from the function inputs
  if (abi.inputs) {
    processInputs(abi.inputs as AbiParameterWithComponents[]);
  }

  return linearized;
};
