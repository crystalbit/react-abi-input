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
 * @param argsString - The arguments to pass to the function as a string (e.g., '"adasdfsdf", (0, 0, 0, 0)')
 * @returns The encoded calldata as a hex string
 * 
 * @example
 * ```ts
 * // Returns the calldata for calling the deployCode function with specific arguments
 * const calldata = combineTx("function deployCode(string,uint256[])", '"adasdfsdf", (0, 0, 0, 0)');
 * ```
 */
export const combineTx = (
  functionSignature: string,
  argsString: string
): string => {
  // replace all [] in argsString with ()
  argsString = argsString.replace(/\[/g, '(').replace(/\]/g, ')');
  try {
    // Parse the arguments string into actual JavaScript values
    let args: unknown[];
    try {
      // Handle complex nested tuple structures safely
      // First, let's identify if we have a tuple structure
      const hasTuples = argsString.includes('(') && argsString.includes(')');

      if (hasTuples) {
        // For tuple arguments, we need a more sophisticated parsing approach
        const processedArgs = processNestedTuples(argsString);
        args = processedArgs;
      } else {
        // Original approach for simple arguments
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
      }
    } catch (parseError) {
      console.error("Parse error details:", parseError);
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

    console.log("Encoding with args:", JSON.stringify(args));

    // Generate the calldata
    const calldata = encodeFunctionData(params);

    return calldata;
  } catch (error) {
    console.error("Error generating calldata:", error);
    throw new Error(`Failed to generate calldata: ${(error as Error).message}`);
  }
};

/**
 * Processes arguments string with nested tuples into a structured array
 * that respects the tuple hierarchy.
 * 
 * @param argsString String like '"hello", (1, (2, 3))'
 * @returns Array of properly structured arguments
 */
function processNestedTuples(argsString: string): unknown[] {
  const result: unknown[] = [];
  let currentPos = 0;
  let currentArg = '';
  let parenDepth = 0;

  // Helper function to process a single argument
  const processArg = (arg: string): unknown => {
    const trimmed = arg.trim();

    // Handle tuples
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      // Recursive call to parse nested tuples
      const innerContent = trimmed.substring(1, trimmed.length - 1);
      return processNestedTuples(innerContent);
    }

    // Handle strings (with quotes)
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.substring(1, trimmed.length - 1);
    }

    // Handle arrays
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        // If JSON parsing fails, try to process as a nested structure
        const innerContent = trimmed.substring(1, trimmed.length - 1);
        return processNestedTuples(innerContent);
      }
    }

    // Handle Ethereum addresses
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      return trimmed;
    }

    // Handle numbers and booleans
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      // Handle integers vs floats
      return trimmed.includes('.') ? parseFloat(trimmed) : parseInt(trimmed, 10);
    }

    // Default to string for anything else
    return trimmed;
  };

  // Parse character by character
  while (currentPos < argsString.length) {
    const char = argsString[currentPos];

    if (char === '(' && (currentArg.trim() === '' || parenDepth > 0)) {
      // Start of a tuple
      parenDepth++;
      currentArg += char;
    } else if (char === ')' && parenDepth > 0) {
      // End of a tuple
      parenDepth--;
      currentArg += char;

      // If we've closed all parentheses and this is the end of a tuple arg
      if (parenDepth === 0 && (currentPos === argsString.length - 1 || argsString[currentPos + 1] === ',')) {
        result.push(processArg(currentArg));
        currentArg = '';
      }
    } else if (char === ',' && parenDepth === 0) {
      // End of a top-level argument
      if (currentArg.trim()) {
        result.push(processArg(currentArg));
      }
      currentArg = '';
    } else if (char === '"' || char === "'") {
      // Handle quotes in strings
      const quoteChar = char;
      currentArg += char;
      currentPos++;

      // Continue until matching quote is found
      while (currentPos < argsString.length) {
        const nextChar = argsString[currentPos];
        currentArg += nextChar;

        if (nextChar === quoteChar && argsString[currentPos - 1] !== '\\') {
          break;
        }

        currentPos++;
      }
    } else {
      // Part of the current argument
      currentArg += char;
    }

    currentPos++;
  }

  // Add the last argument if there is one
  if (currentArg.trim()) {
    result.push(processArg(currentArg));
  }

  return result;
}
