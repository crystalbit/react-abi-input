import {
  encodeFunctionData,
  parseAbiItem,
  type EncodeFunctionDataParameters,
  type AbiFunction
} from 'viem';

/**
 * Combines a function signature and arguments to create Ethereum calldata using Viem
 * 
 * @param functionSignature - The Ethereum function signature (e.g., "function deployCode(string,uint256[])")
 * @param argsString - The arguments to pass to the function as a string (e.g., '"adasdfsdf", [0, 0, 0, 0]')
 * @returns The encoded calldata as a hex string
 * 
 * @example
 * ```ts
 * // Returns the calldata for calling the deployCode function with specific arguments
 * const calldata = combineTx("function deployCode(string,uint256[])", '"adasdfsdf", [0, 0, 0, 0]');
 * ```
 */
export const combineTx = (
  functionSignature: string,
  argsString: string
): string => {
  try {
    // Parse the arguments string into actual JavaScript values
    let args: unknown[];
    try {
      // First approach: try to parse as a JSON array directly
      const wrappedArgs = `[${argsString}]`;

      // Handle Ethereum addresses and numbers separately
      // This is needed because addresses aren't valid JSON without quotes
      // and we want to maintain them in their original format
      const processedArgsString = argsString
        .split(',')
        .map(arg => {
          const trimmedArg = arg.trim();

          // If it's already a string or array (has quotes or brackets), leave as is
          if (
            (trimmedArg.startsWith('"') && trimmedArg.endsWith('"')) ||
            (trimmedArg.startsWith('[') && trimmedArg.endsWith(']')) ||
            (trimmedArg.startsWith('{') && trimmedArg.endsWith('}'))
          ) {
            return trimmedArg;
          }

          // If it looks like an Ethereum address, wrap in quotes
          if (/^0x[a-fA-F0-9]{40}$/.test(trimmedArg)) {
            return `"${trimmedArg}"`;
          }

          // If it looks like a number, leave as is
          if (/^-?\d+(\.\d+)?$/.test(trimmedArg)) {
            return trimmedArg;
          }

          // Otherwise wrap in quotes to make it a valid JSON string
          return `"${trimmedArg}"`;
        })
        .join(',');

      const processedWrappedArgs = `[${processedArgsString}]`;
      args = JSON.parse(processedWrappedArgs);
    } catch (parseError) {
      throw new Error(`Failed to parse args string: ${argsString}. Error: ${(parseError as Error).message}`);
    }

    // Ensure the function signature has the 'function' keyword
    const normalizedSignature = functionSignature.trim().startsWith('function')
      ? functionSignature
      : `function ${functionSignature}`;

    // Parse the function signature into an ABI item
    const abiItem = parseAbiItem(normalizedSignature);

    // Extract the function name from the signature
    // Remove 'function' if present, then take everything before the first parenthesis
    const functionNameMatch = normalizedSignature.replace(/^function\s+/, '').match(/^([^(]+)/);
    const functionName = functionNameMatch ? functionNameMatch[1].trim() : '';

    if (!functionName) {
      throw new Error('Could not extract function name from signature');
    }

    // Prepare parameters for encodeFunctionData
    const params: EncodeFunctionDataParameters = {
      abi: [abiItem],
      functionName,
      args,
    };

    // Generate the calldata
    const calldata = encodeFunctionData(params);

    return calldata;
  } catch (error) {
    console.error("Error generating calldata:", error);
    throw new Error(`Failed to generate calldata: ${(error as Error).message}`);
  }
};
