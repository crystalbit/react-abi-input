// Parse a type and name from a type signature component
export const parseTypeAndName = (item: string): { type: string, name: string } => {
  item = item.trim();

  // If the item is empty, return empty type and name
  if (!item) {
    return { type: '', name: '' };
  }

  // Special case for tuples: we need to find the matching parentheses
  if (item.startsWith('(')) {
    let parenDepth = 0;
    let tupleEndIndex = -1;

    for (let i = 0; i < item.length; i++) {
      if (item[i] === '(') parenDepth++;
      if (item[i] === ')') {
        parenDepth--;
        if (parenDepth === 0) {
          tupleEndIndex = i;
          break;
        }
      }
    }

    if (tupleEndIndex === -1) {
      // Malformed tuple, return as is
      return { type: item, name: '' };
    }

    // Check if there's anything after the closing parenthesis
    if (tupleEndIndex < item.length - 1) {
      const tupleType = item.substring(0, tupleEndIndex + 1);
      const rest = item.substring(tupleEndIndex + 1).trim();

      // Check if there's array notation after the tuple
      if (rest.startsWith('[')) {
        // Find the end of the array notation
        let arrayEndIndex = -1;
        let squareBracketDepth = 0;

        for (let i = tupleEndIndex + 1; i < item.length; i++) {
          if (item[i] === '[') squareBracketDepth++;
          if (item[i] === ']') {
            squareBracketDepth--;
            if (squareBracketDepth === 0) {
              arrayEndIndex = i;
              break;
            }
          }
        }

        if (arrayEndIndex === -1) {
          // Malformed array notation, return as is
          return { type: item, name: '' };
        }

        // Get the type including array notation
        const typeWithArray = item.substring(0, arrayEndIndex + 1);

        // Get everything after the array notation as the name
        const nameAfterArray = item.substring(arrayEndIndex + 1).trim();

        return { type: typeWithArray, name: nameAfterArray };
      } else {
        // No array notation, just a space and then the name
        const parts = rest.split(' ').filter(Boolean);
        return { type: tupleType, name: parts.join(' ') };
      }
    } else {
      // Tuple without name
      return { type: item, name: '' };
    }
  }

  // For complex types like "address payable", try to find the last word
  // that could be a name (not a known Solidity type modifier)
  const typeModifiers = ['memory', 'storage', 'calldata', 'payable', 'internal', 'external'];
  const words = item.split(' ').filter(Boolean);

  // If only one word, it's just a type
  if (words.length === 1) {
    return { type: words[0], name: '' };
  }

  // Find the index where the name starts (it should be the last word that's not a type modifier)
  let nameIndex = words.length - 1;
  if (typeModifiers.includes(words[nameIndex])) {
    // Last word is a modifier, so there's no name
    return { type: words.join(' '), name: '' };
  }

  // The type is everything before the name
  const type = words.slice(0, nameIndex).join(' ');
  const name = words[nameIndex];

  return { type, name };
};

// Parse a tuple type signature into components with types and names
export const parseTypeSignature = (signature: string): Array<{ type: string, name: string }> => {
  // Check if signature is empty or not a tuple
  if (!signature || !signature.startsWith('(') || !signature.endsWith(')')) {
    return [];
  }

  // Remove outer parentheses
  const content = signature.slice(1, -1).trim();

  // Handle empty tuple
  if (!content) {
    return [];
  }

  const result = [];
  let currentPos = 0;
  let parenDepth = 0;
  let currentItem = '';

  // Parse the signature character by character
  while (currentPos < content.length) {
    const char = content[currentPos];

    if (char === '(') {
      parenDepth++;
      currentItem += char;
    } else if (char === ')') {
      parenDepth--;
      currentItem += char;
    } else if (char === ',' && parenDepth === 0) {
      // End of an item, only process when at top level (not inside nested tuple)
      if (currentItem.trim()) {
        const { type, name } = parseTypeAndName(currentItem.trim());
        result.push({ type, name });
      }
      currentItem = '';
    } else {
      currentItem += char;
    }

    currentPos++;
  }

  // Add the last item
  if (currentItem.trim()) {
    const { type, name } = parseTypeAndName(currentItem.trim());
    result.push({ type, name });
  }

  return result;
};
