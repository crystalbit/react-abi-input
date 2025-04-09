import React, { useState, useEffect } from 'react';
import './SolidityInput.css';

// Helper function to parse complex tuple types
interface ParsedTupleField {
  type: string;
  name: string;
  isComplex: boolean;
  components?: ParsedTupleField[];
}

/**
 * Parses a complex tuple type format like "(uint256 a, (uint256 b, uint256 c) param1)"
 * and extracts the component structure to use with SolidityInput
 */
const parseTupleType = (typeStr: string): { fields: ParsedTupleField[], isArray: boolean } => {
  // Check if this is an array type
  const isArray = typeStr.includes('[]');
  // Remove array notation for processing
  const baseType = isArray ? typeStr.replace(/\[\d*\]$/, '') : typeStr;

  // Only process if it's a tuple format (starts with '(')
  if (!baseType.startsWith('(') || !baseType.endsWith(')')) {
    return { fields: [], isArray };
  }

  // Extract the content between parentheses
  const content = baseType.substring(1, baseType.length - 1);
  const fields: ParsedTupleField[] = [];

  // Parse the fields with awareness of nested tuples
  let currentPos = 0;
  let parenDepth = 0;
  let currentField = '';

  while (currentPos < content.length) {
    const char = content[currentPos];

    if (char === '(' && parenDepth === 0) {
      // Start of a nested tuple
      parenDepth++;
      currentField += char;
    } else if (char === '(' && parenDepth > 0) {
      // Nested parenthesis inside already nested tuple
      parenDepth++;
      currentField += char;
    } else if (char === ')' && parenDepth > 0) {
      // End of a nested tuple
      parenDepth--;
      currentField += char;
    } else if (char === ',' && parenDepth === 0) {
      // End of current field
      if (currentField.trim()) {
        const parsedField = parseField(currentField.trim());
        if (parsedField) {
          fields.push(parsedField);
        }
      }
      currentField = '';
    } else {
      // Part of current field
      currentField += char;
    }

    currentPos++;
  }

  // Add the last field
  if (currentField.trim()) {
    const parsedField = parseField(currentField.trim());
    if (parsedField) {
      fields.push(parsedField);
    }
  }

  return { fields, isArray };
};

/**
 * Parse a single field from a tuple type description
 * Examples: "uint256 a", "(uint256 b, uint256 c) param1"
 */
const parseField = (field: string): ParsedTupleField | null => {
  if (!field) return null;

  // Check if it's a nested tuple
  if (field.startsWith('(')) {
    // Find the closing parenthesis index
    let parenDepth = 0;
    let closingIndex = -1;

    for (let i = 0; i < field.length; i++) {
      if (field[i] === '(') parenDepth++;
      if (field[i] === ')') parenDepth--;

      if (parenDepth === 0 && field[i] === ')') {
        closingIndex = i;
        break;
      }
    }

    if (closingIndex === -1) return null;

    // Extract the nested tuple part and the field name
    const tupleType = field.substring(0, closingIndex + 1);
    const nameMatch = field.substring(closingIndex + 1).trim().match(/^([a-zA-Z0-9_]+)$/);
    const name = nameMatch ? nameMatch[1] : `param${Math.floor(Math.random() * 1000)}`;

    // Recursively parse the nested tuple
    const { fields } = parseTupleType(tupleType);

    return {
      type: tupleType,
      name,
      isComplex: true,
      components: fields
    };
  } else {
    // Regular field: "type name"
    const parts = field.split(' ');

    if (parts.length < 2) return null;

    const type = parts[0];
    const name = parts[1];

    return {
      type,
      name,
      isComplex: false
    };
  }
};

export interface SolidityInputProps {
  /**
   * The Solidity type of the input (uint256, address, bool, etc.)
   */
  type: string;
  /**
   * The name of the parameter
   */
  name: string;
  /**
   * The current value of the parameter
   */
  value: string;
  /**
   * Callback when the value changes
   */
  onChange: (value: string, isValid: boolean) => void;
  /**
   * Additional CSS class name
   */
  className?: string;
  /**
   * Tuple components for tuple types
   */
  tupleComponents?: React.ReactNode[];
  /**
   * Tuple component renderer function for each array item
   */
  renderTupleItem?: (index: number, value: string) => React.ReactNode;
  /**
   * Tuple component definitions
   */
  tupleStructure?: {
    name: string;
    type: string;
  }[];
}

export const SolidityInput: React.FC<SolidityInputProps> = ({
  type,
  name,
  value = '',
  onChange,
  className = '',
  tupleComponents,
  renderTupleItem,
  tupleStructure,
  ...props
}) => {
  const [isValid, setIsValid] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isTuple, setIsTuple] = useState<boolean>(false);
  const [isArray, setIsArray] = useState<boolean>(false);
  const [arrayItems, setArrayItems] = useState<{ value: string; isValid: boolean }[]>([]);
  const [baseType, setBaseType] = useState<string>('');
  const [parsedTupleFields, setParsedTupleFields] = useState<ParsedTupleField[]>([]);

  useEffect(() => {
    // Check if this is a complex tuple type
    const isComplexTuple = type.startsWith('(') && type.includes(')');

    // For complex tuple types, parse the structure from the type string
    if (isComplexTuple) {
      const { fields, isArray: isTupleArray } = parseTupleType(type);
      setParsedTupleFields(fields);

      setIsTuple(true);
      setIsArray(isTupleArray);
      setBaseType(isTupleArray ? type.replace(/\[\d*\]$/, '') : type);

      // Complex tuples are always considered valid during initialization
      setIsValid(true);
      setError('');

      return;
    }

    // Handle regular types (existing code)
    const isArrayType = type.includes('[');
    setIsArray(isArrayType);

    // Remove array notation to get base type
    const extractedBaseType = type.replace(/\[\d*\]$/, '');
    setBaseType(extractedBaseType);

    // Check if base type is tuple
    const isTupleType = extractedBaseType === 'tuple';
    setIsTuple(isTupleType);

    // For tuple types, we need specific renderers
    if (isTupleType && isArrayType && !tupleStructure && !renderTupleItem) {
      console.warn(`SolidityInput: tupleStructure or renderTupleItem prop is required for tuple arrays (${name})`);
    }

    if (isTupleType && !isArrayType && !tupleStructure && !tupleComponents) {
      console.warn(`SolidityInput: tupleStructure or tupleComponents prop is required for tuples (${name})`);
    }

    // For tuple types or arrays, handle validation differently
    if (isTupleType) {
      setIsValid(true);
      setError('');
      onChange(value, true);
    } else if (isArrayType) {
      // Initialize array items if value is present
      try {
        let items: { value: string; isValid: boolean }[] = [];

        if (value && value !== '[]') {
          // Parse JSON array from value
          const parsedValue = JSON.parse(value);

          if (Array.isArray(parsedValue)) {
            items = parsedValue.map(item => ({
              value: String(item),
              // For tuples, always consider valid since they're managed by nested components
              isValid: isTupleType ? true : validateSingleValue(String(item), extractedBaseType)
            }));
          }
        }

        setArrayItems(items);

        // Check if all items are valid - empty arrays are valid
        const allValid = items.length === 0 || items.every(item => item.isValid);
        setIsValid(allValid);
        setError(allValid ? '' : 'One or more array items are invalid');

        // For empty array, ensure we send a valid empty array JSON to parent
        if (items.length === 0) {
          onChange('[]', true);
        }
      } catch (e) {
        // If JSON parsing fails, initialize empty array
        setArrayItems([]);
        setIsValid(true);
        setError('');
        onChange('[]', true);
      }
    } else {
      // For non-array, non-tuple types
      // Only validate if there's a value, to avoid showing errors on initial render
      if (value || type === 'string') {
        validateInput(value);
      } else {
        // Empty values are not valid for basic types
        setIsValid(false);
        setError('Value cannot be empty');
      }
    }
  }, [type]);

  // Update when value changes from parent
  useEffect(() => {
    if (isArray) {
      try {
        if (value && value !== '[]') {
          const parsedValue = JSON.parse(value);
          if (Array.isArray(parsedValue)) {
            setArrayItems(parsedValue.map(item => ({
              value: String(item),
              // Always consider tuple items valid since they're managed by nested components
              // Both traditional 'tuple' type and the new complex tuple format with parentheses
              isValid: baseType === 'tuple' || baseType.startsWith('(') ? true : validateSingleValue(String(item), baseType)
            })));
          }
        } else {
          // Handle empty array properly
          setArrayItems([]);
          setIsValid(true);
          setError('');
        }
      } catch (e) {
        // If value can't be parsed as JSON array, initialize as empty
        setArrayItems([]);
        setIsValid(true);
        setError('');
      }
    } else if (!isTuple) {
      validateInput(value);
    }
  }, [value, isArray, baseType]);

  // Update parent when array items change
  useEffect(() => {
    if (isArray) {
      const allValid = arrayItems.length === 0 || arrayItems.every(item => item.isValid);
      setIsValid(allValid);
      setError(allValid ? '' : 'One or more array items are invalid');

      const arrayValue = JSON.stringify(arrayItems.map(item => item.value));
      onChange(arrayValue, allValid);
    }
  }, [arrayItems, isArray]);

  // Function to validate single array item
  const validateSingleValue = (itemValue: string, itemType: string): boolean => {
    // Skip validation for tuple types - tuples are always considered valid
    // as they are handled by nested components
    if (itemType === 'tuple') {
      return true;
    }

    if (!itemValue.trim() && itemValue !== 'false') {
      return false;
    }

    try {
      if (itemType.startsWith('uint')) {
        const value = BigInt(itemValue);
        if (value < BigInt(0)) {
          return false;
        }

        if (itemType !== 'uint256') {
          const bits = parseInt(itemType.replace('uint', ''));
          const maxValue = (BigInt(1) << BigInt(bits)) - BigInt(1);
          if (value > maxValue) {
            return false;
          }
        }
      } else if (itemType.startsWith('int')) {
        const value = BigInt(itemValue);

        if (itemType !== 'int256') {
          const bits = parseInt(itemType.replace('int', ''));
          const maxValue = (BigInt(1) << BigInt(bits - 1)) - BigInt(1);
          const minValue = -(BigInt(1) << BigInt(bits - 1));
          if (value > maxValue || value < minValue) {
            return false;
          }
        }
      } else if (itemType === 'bool') {
        if (itemValue !== 'true' && itemValue !== 'false') {
          return false;
        }
      } else if (itemType === 'address') {
        if (!/^0x[0-9a-fA-F]{40}$/.test(itemValue)) {
          return false;
        }
      } else if (itemType === 'string') {
        // Any string is valid
      } else if (itemType === 'bytes') {
        if (!/^0x[0-9a-fA-F]*$/.test(itemValue)) {
          return false;
        }
      } else if (/^bytes\d+$/.test(itemType)) {
        const size = parseInt(itemType.replace('bytes', ''));
        const expectedLength = size * 2 + 2;

        if (!itemValue.startsWith('0x')) {
          return false;
        }

        if (itemValue.length !== expectedLength) {
          return false;
        }

        if (!/^0x[0-9a-fA-F]+$/.test(itemValue)) {
          return false;
        }
      } else {
        return false;
      }

      return true;
    } catch (e) {
      return false;
    }
  };

  // Function to validate input based on Solidity type
  const validateInput = (inputValue: string): boolean => {
    // Skip validation for tuple types and arrays
    if (isTuple || isArray || type === 'string') {
      return true;
    }

    if (!inputValue.trim() && inputValue !== 'false') {
      setError('Value cannot be empty');
      setIsValid(false);
      onChange(inputValue, false);
      return false;
    }

    try {
      // Handle different Solidity types
      if (type.startsWith('uint')) {
        // For uint8 to uint256
        const value = BigInt(inputValue);
        if (value < BigInt(0)) {
          throw new Error('Unsigned integer cannot be negative');
        }

        // Check if the value fits in the specified bit size (if not uint256)
        if (type !== 'uint256') {
          const bits = parseInt(type.replace('uint', ''));
          // Calculate max value using shifting: (1n << BigInt(bits)) - 1n
          const maxValue = (BigInt(1) << BigInt(bits)) - BigInt(1);
          if (value > maxValue) {
            throw new Error(`Value exceeds maximum for ${type}`);
          }
        }
      } else if (type.startsWith('int')) {
        // For int8 to int256
        const value = BigInt(inputValue);

        // Check if the value fits in the specified bit size (if not int256)
        if (type !== 'int256') {
          const bits = parseInt(type.replace('int', ''));
          // Calculate max value using shifting: (1n << BigInt(bits-1)) - 1n
          const maxValue = (BigInt(1) << BigInt(bits - 1)) - BigInt(1);
          // Calculate min value using shifting: -(1n << BigInt(bits-1))
          const minValue = -(BigInt(1) << BigInt(bits - 1));
          if (value > maxValue || value < minValue) {
            throw new Error(`Value out of range for ${type}`);
          }
        }
      } else if (type === 'bool') {
        // For boolean values
        if (inputValue !== 'true' && inputValue !== 'false') {
          throw new Error('Boolean must be "true" or "false"');
        }
      } else if (type === 'address') {
        // For Ethereum addresses
        if (!/^0x[0-9a-fA-F]{40}$/.test(inputValue)) {
          throw new Error('Invalid Ethereum address format');
        }
      } else if (type === 'string') {
        // String validation - any string is valid
      } else if (type === 'bytes') {
        // General bytes validation - must be hex
        if (!/^0x[0-9a-fA-F]*$/.test(inputValue)) {
          throw new Error('Bytes must be hex format starting with 0x');
        }
      } else if (/^bytes\d+$/.test(type)) {
        // For bytes1 to bytes32
        const size = parseInt(type.replace('bytes', ''));
        // Each byte is 2 hex chars plus 0x prefix
        const expectedLength = size * 2 + 2;

        if (!inputValue.startsWith('0x')) {
          throw new Error('Bytes must start with 0x');
        }

        if (inputValue.length !== expectedLength) {
          throw new Error(`${type} must be exactly ${size} bytes (${expectedLength} chars including 0x)`);
        }

        if (!/^0x[0-9a-fA-F]+$/.test(inputValue)) {
          throw new Error('Bytes must contain only hex characters');
        }
      } else {
        // Unknown type
        throw new Error(`Unsupported type: ${type}`);
      }

      setError('');
      setIsValid(true);
      onChange(inputValue, true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid input');
      setIsValid(false);
      onChange(inputValue, false);
      return false;
    }
  };

  // Function to set an address to the zero address
  const setZeroAddress = () => {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    onChange(zeroAddress, true);
  };

  // Function to set an array item address to the zero address
  const setArrayItemZeroAddress = (index: number) => {
    const newItems = [...arrayItems];
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    newItems[index] = { value: zeroAddress, isValid: true };
    setArrayItems(newItems);
  };

  // Function to set an address field to zero in a complex tuple structure
  const setComplexTupleAddressToZero = (fieldName: string) => {
    try {
      const tupleObj = JSON.parse(value || '{}');
      const zeroAddress = '0x0000000000000000000000000000000000000000';

      // Create the updated tuple value
      const newTupleValue = JSON.stringify({
        ...tupleObj,
        [fieldName]: zeroAddress
      });

      // The zero address is always valid for address fields
      setIsValid(true);
      setError('');

      // Pass the updated value back to parent with valid=true
      onChange(newTupleValue, true);
    } catch (e: unknown) {
      // If parsing fails, create a new object with just this field set to zero
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const newTupleValue = JSON.stringify({
        [fieldName]: zeroAddress
      });

      // Zero address is always valid
      setIsValid(true);
      setError('');

      onChange(newTupleValue, true);
    }
  };

  const getInputType = () => {
    if (baseType.startsWith('uint') || baseType.startsWith('int')) {
      return 'number';
    } else if (baseType === 'bool') {
      return 'checkbox';
    } else {
      return 'text';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let newValue: string;

    if (type === 'bool' && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked ? 'true' : 'false';
    } else {
      newValue = e.target.value;
    }

    onChange(newValue, validateInput(newValue));
  };

  const handleArrayItemChange = (index: number, newValue: string) => {
    const newItems = [...arrayItems];
    // For tuple types, always consider valid as they're managed by nested components
    const isItemValid = baseType === 'tuple' ? true : validateSingleValue(newValue, baseType);
    newItems[index] = { value: newValue, isValid: isItemValid };
    setArrayItems(newItems);
  };

  const addArrayItem = () => {
    let defaultValue = '';

    // Set sensible default values based on type
    if (baseType === 'tuple') {
      // For tuple types, create an object with default values for each field in the tuple structure
      if (tupleStructure) {
        const defaultTupleValues: Record<string, string> = {};
        tupleStructure.forEach(field => {
          // Set appropriate default values based on field type
          if (field.type.startsWith('uint') || field.type.startsWith('int')) {
            defaultTupleValues[field.name] = '0';
          } else if (field.type === 'bool') {
            defaultTupleValues[field.name] = 'false';
          } else if (field.type === 'address') {
            defaultTupleValues[field.name] = '0x0000000000000000000000000000000000000000';
          } else if (field.type === 'string') {
            defaultTupleValues[field.name] = '';
          } else if (field.type.startsWith('bytes')) {
            if (/^bytes(\d+)$/.test(field.type)) {
              const size = parseInt(field.type.replace('bytes', ''));
              defaultTupleValues[field.name] = '0x' + '0'.repeat(size * 2);
            } else {
              defaultTupleValues[field.name] = '0x';
            }
          } else {
            defaultTupleValues[field.name] = '';
          }
        });
        defaultValue = JSON.stringify(defaultTupleValues);
      } else {
        // If no tuple structure is provided, use an empty object
        defaultValue = JSON.stringify({});
      }
    } else if (baseType.startsWith('uint')) {
      defaultValue = '0';
    } else if (baseType.startsWith('int')) {
      defaultValue = '0';
    } else if (baseType === 'bool') {
      defaultValue = 'false';
    } else if (baseType === 'address') {
      defaultValue = '0x0000000000000000000000000000000000000000';
    } else if (baseType === 'bytes' || /^bytes\d+$/.test(baseType)) {
      // For fixed-length bytes, create the correct-sized hex string
      if (/^bytes(\d+)$/.test(baseType)) {
        const size = parseInt(baseType.replace('bytes', ''));
        defaultValue = '0x' + '0'.repeat(size * 2);
      } else {
        defaultValue = '0x';
      }
    }

    setArrayItems([...arrayItems, { value: defaultValue, isValid: true }]);
  };

  const removeArrayItem = (index: number) => {
    const newItems = [...arrayItems];
    newItems.splice(index, 1);
    setArrayItems(newItems);
  };

  // For complex tuple types, render nested solidity inputs based on parsed structure
  const renderComplexTuple = () => {
    if (parsedTupleFields.length === 0) return null;

    return (
      <div className="solidity-input__complex-tuple">
        {parsedTupleFields.map((field, index) => {
          // Try to parse the tuple value as JSON
          let fieldValue = '';
          try {
            const tupleObj = JSON.parse(value || '{}');
            fieldValue = tupleObj[field.name] || '';
          } catch (e: unknown) {
            // If parsing fails, just use an empty string
          }

          // If it's a nested tuple field
          if (field.isComplex && field.components) {
            return (
              <div key={index} className="solidity-input__nested-tuple">
                <label className="solidity-input__tuple-field-label">
                  {field.name}:
                </label>
                <SolidityInput
                  type={field.type}
                  name={field.name}
                  value={fieldValue}
                  onChange={(newValue, isFieldValid) => {
                    try {
                      const tupleObj = JSON.parse(value || '{}');
                      const newTupleValue = JSON.stringify({
                        ...tupleObj,
                        [field.name]: newValue
                      });

                      // Update validity state of the parent component based on child validity
                      if (!isFieldValid) {
                        setIsValid(false);
                        setError(`Invalid value in nested field "${field.name}"`);
                      } else {
                        // Check other fields before setting parent as valid
                        // This ensures we don't overwrite other field errors
                        const otherFieldsValid = Object.keys(tupleObj)
                          .filter(key => key !== field.name)
                          .every(key => {
                            const fieldDef = parsedTupleFields.find(f => f.name === key);
                            // Skip complex validation here as it's handled by the child components
                            if (fieldDef?.isComplex) return true;
                            // For simple fields, validate the value if we have a definition
                            return fieldDef ? validateSingleValue(tupleObj[key], fieldDef.type) : true;
                          });

                        if (otherFieldsValid) {
                          setIsValid(true);
                          setError('');
                        }
                      }

                      onChange(newTupleValue, isFieldValid);
                    } catch (e: unknown) {
                      // If parsing fails, create a new object with just this field
                      const newTupleValue = JSON.stringify({
                        [field.name]: newValue
                      });

                      // Also update validity state 
                      if (!isFieldValid) {
                        setIsValid(false);
                        setError(`Invalid value in nested field "${field.name}"`);
                      } else {
                        setIsValid(true);
                        setError('');
                      }

                      onChange(newTupleValue, isFieldValid);
                    }
                  }}
                  className="solidity-input__nested"
                />
              </div>
            );
          }

          // For simple fields within the complex tuple
          return (
            <div key={index} className="solidity-input__tuple-field">
              <label className="solidity-input__tuple-field-label">
                {field.name}: <span className="solidity-input__tuple-field-type">{field.type}</span>
              </label>
              {field.type === 'bool' ? (
                <select
                  value={fieldValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    try {
                      const tupleObj = JSON.parse(value || '{}');
                      const newTupleValue = JSON.stringify({
                        ...tupleObj,
                        [field.name]: newValue
                      });

                      // Boolean values are always valid
                      setIsValid(true);
                      setError('');

                      onChange(newTupleValue, true);
                    } catch (e: unknown) {
                      // If parsing fails, create a new object with just this field
                      const newTupleValue = JSON.stringify({
                        [field.name]: newValue
                      });
                      onChange(newTupleValue, true);
                    }
                  }}
                  className="solidity-input__tuple-field-select"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <div className="solidity-input__field-container">
                  <input
                    type={field.type.startsWith('uint') || field.type.startsWith('int') ? 'number' : 'text'}
                    value={fieldValue}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      try {
                        const tupleObj = JSON.parse(value || '{}');

                        // Validate the new value
                        const isFieldValid = validateSingleValue(newValue, field.type);

                        // Update the parent component's validity state
                        if (!isFieldValid) {
                          setIsValid(false);
                          setError(`Invalid value for field "${field.name}" (${field.type})`);
                        } else {
                          // Check all other fields before setting the parent as valid
                          const otherFieldsValid = Object.keys(tupleObj)
                            .filter(key => key !== field.name)
                            .every(key => {
                              const fieldDef = parsedTupleFields.find(f => f.name === key);
                              // Skip complex validation here as it's handled by the child components
                              if (fieldDef?.isComplex) return true;
                              // For simple fields, validate the value if we have a definition
                              return fieldDef ? validateSingleValue(tupleObj[key], fieldDef.type) : true;
                            });

                          if (otherFieldsValid) {
                            setIsValid(true);
                            setError('');
                          }
                        }

                        const newTupleValue = JSON.stringify({
                          ...tupleObj,
                          [field.name]: newValue
                        });
                        onChange(newTupleValue, isFieldValid);
                      } catch (e: unknown) {
                        // If parsing fails, create a new object with just this field
                        const isFieldValid = validateSingleValue(newValue, field.type);

                        if (!isFieldValid) {
                          setIsValid(false);
                          setError(`Invalid value for field "${field.name}" (${field.type})`);
                        } else {
                          setIsValid(true);
                          setError('');
                        }

                        const newTupleValue = JSON.stringify({
                          [field.name]: newValue
                        });
                        onChange(newTupleValue, isFieldValid);
                      }
                    }}
                    className={`solidity-input__tuple-field-input ${!validateSingleValue(fieldValue, field.type) ? 'solidity-input__tuple-field-input--error' : ''}`}
                    placeholder={`Enter ${field.type} value...`}
                  />
                  {field.type === 'address' && (
                    <button
                      type="button"
                      onClick={() => setComplexTupleAddressToZero(field.name)}
                      className="solidity-input__zero-address-button"
                      title="Set to zero address"
                    >
                      0x0
                    </button>
                  )}
                </div>
              )}
              {!validateSingleValue(fieldValue, field.type) && (
                <div className="solidity-input__field-error">
                  Invalid {field.type}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Update the tuple rendering to handle complex tuples
  if (isTuple && !isArray) {
    // For complex tuple types (with the new format)
    if (parsedTupleFields.length > 0) {
      return (
        <div className={`solidity-input ${className} solidity-input--tuple solidity-input--complex-tuple ${!isValid ? 'solidity-input--error' : ''}`}>
          <div className="solidity-input__label">
            <span className="solidity-input__name">{name}</span>
            <span className="solidity-input__type">{type}</span>
          </div>
          <div className="solidity-input__tuple-content">
            {renderComplexTuple()}
          </div>
          {!isValid && error && (
            <div className="solidity-input__error">{error}</div>
          )}
        </div>
      );
    }

    // For traditional tuple types (existing code)
    return (
      <div className={`solidity-input ${className} solidity-input--tuple`}>
        <div className="solidity-input__label">
          <span className="solidity-input__name">{name}</span>
          <span className="solidity-input__type">{type}</span>
        </div>
        <div className="solidity-input__tuple-content">
          {tupleComponents || (
            tupleStructure ? (
              <div className="solidity-input__tuple-fields">
                {tupleStructure.map((field, fieldIndex) => {
                  // Try to parse the tuple value as JSON
                  let fieldValue = '';
                  try {
                    const tupleObj = JSON.parse(value || '{}');
                    fieldValue = tupleObj[field.name] || '';
                  } catch (e: unknown) {
                    // If parsing fails, just use an empty string
                  }

                  // Create an input for each field in the tuple
                  return (
                    <div key={fieldIndex} className="solidity-input__tuple-field">
                      <label className="solidity-input__tuple-field-label">
                        {field.name}: <span className="solidity-input__tuple-field-type">{field.type}</span>
                      </label>
                      {field.type === 'bool' ? (
                        <select
                          value={fieldValue}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            try {
                              const tupleObj = JSON.parse(value || '{}');
                              const newTupleValue = JSON.stringify({
                                ...tupleObj,
                                [field.name]: newValue
                              });
                              onChange(newTupleValue, true);
                            } catch (e: unknown) {
                              // If parsing fails, create a new object with just this field
                              const newTupleValue = JSON.stringify({
                                [field.name]: newValue
                              });
                              onChange(newTupleValue, true);
                            }
                          }}
                          className="solidity-input__tuple-field-select"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <div className="solidity-input__field-container">
                          <input
                            type={field.type.startsWith('uint') || field.type.startsWith('int') ? 'number' : 'text'}
                            value={fieldValue}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              try {
                                const tupleObj = JSON.parse(value || '{}');
                                const newTupleValue = JSON.stringify({
                                  ...tupleObj,
                                  [field.name]: newValue
                                });
                                onChange(newTupleValue, true);
                              } catch (e: unknown) {
                                // If parsing fails, create a new object with just this field
                                const newTupleValue = JSON.stringify({
                                  [field.name]: newValue
                                });
                                onChange(newTupleValue, true);
                              }
                            }}
                            className="solidity-input__tuple-field-input"
                            placeholder={`Enter ${field.type} value...`}
                          />
                          {field.type === 'address' && (
                            <button
                              type="button"
                              onClick={() => setComplexTupleAddressToZero(field.name)}
                              className="solidity-input__zero-address-button"
                              title="Set to zero address"
                            >
                              0x0
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="solidity-input__tuple-error">
                Tuple structure undefined
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // For array types, including arrays of tuples
  if (isArray) {
    // Special handling for complex tuple arrays
    const isComplexTupleArray = baseType.startsWith('(') && baseType.includes(')');

    return (
      <div className={`solidity-input ${className} solidity-input--array ${isTuple || isComplexTupleArray ? 'solidity-input--tuple-array' : ''} ${!isValid ? 'solidity-input--error' : ''}`}>
        <div className="solidity-input__label">
          <span className="solidity-input__name">{name}</span>
          <span className="solidity-input__type">{type}</span>
        </div>

        <div className="solidity-input__array-container">
          {arrayItems.length === 0 ? (
            <div className="solidity-input__empty-array">
              Empty array
            </div>
          ) : (
            // Only render array items if there are any
            arrayItems.map((item, index) => (
              <div key={index} className={`solidity-input__array-item ${!item.isValid ? 'solidity-input__array-item--error' : ''}`}>
                {/* For complex tuple array types with the new format */}
                {isComplexTupleArray ? (
                  <div className="solidity-input__tuple-array-item">
                    <span className="solidity-input__array-index">{index}:</span>
                    <div className="solidity-input__tuple-item-content">
                      <SolidityInput
                        type={baseType}
                        name={`${name}[${index}]`}
                        value={item.value}
                        onChange={(newValue, isFieldValid) => {
                          handleArrayItemChange(index, newValue);

                          // Update validity state of array items
                          const newItems = [...arrayItems];
                          newItems[index] = {
                            value: newValue,
                            isValid: isFieldValid
                          };
                          setArrayItems(newItems);

                          // Check if all items are valid
                          const allValid = newItems.every(i => i.isValid);
                          setIsValid(allValid);
                          if (!allValid) {
                            setError(`One or more array items are invalid`);
                          } else {
                            setError('');
                          }

                          // Propagate validity state to parent
                          onChange(
                            JSON.stringify(newItems.map(i => i.value)),
                            allValid
                          );
                        }}
                        className="solidity-input__nested"
                        // Pass the tuple structure to the nested component based on the parsed fields
                        tupleStructure={parsedTupleFields.map(field => ({
                          name: field.name,
                          type: field.type
                        }))}
                      />
                    </div>
                  </div>
                ) : isTuple ? (
                  <div className="solidity-input__tuple-array-item">
                    <span className="solidity-input__array-index">{index}:</span>
                    <div className="solidity-input__tuple-item-content">
                      {renderTupleItem ?
                        renderTupleItem(index, item.value) :
                        tupleStructure ? (
                          <div className="solidity-input__tuple-fields">
                            {tupleStructure.map((field, fieldIndex) => {
                              // Try to parse the tuple value as JSON
                              let fieldValue = '';
                              try {
                                const tupleObj = JSON.parse(item.value);
                                fieldValue = tupleObj[field.name] || '';
                              } catch (e: unknown) {
                                // If parsing fails, just use an empty string
                              }

                              // Create an input for each field in the tuple
                              return (
                                <div key={fieldIndex} className="solidity-input__tuple-field">
                                  <label className="solidity-input__tuple-field-label">
                                    {field.name}: <span className="solidity-input__tuple-field-type">{field.type}</span>
                                  </label>
                                  {field.type === 'bool' ? (
                                    <select
                                      value={fieldValue}
                                      onChange={(e) => {
                                        const newValue = e.target.value;
                                        try {
                                          const tupleObj = JSON.parse(item.value);

                                          // Validate the field value first
                                          const isFieldValid = validateSingleValue(newValue, field.type);

                                          const newTupleValue = JSON.stringify({
                                            ...tupleObj,
                                            [field.name]: newValue
                                          });

                                          // Check if all fields in the tuple are valid
                                          const allFieldsValid = Object.keys({ ...tupleObj, [field.name]: newValue })
                                            .every(key => {
                                              const fieldDef = tupleStructure?.find(f => f.name === key);
                                              if (!fieldDef) return true; // Skip fields without definition
                                              // Special case for the current field
                                              if (key === field.name) return isFieldValid;
                                              // For other fields, validate their values
                                              return validateSingleValue(tupleObj[key], fieldDef.type);
                                            });

                                          // Update array item with new value and validity state
                                          handleArrayItemChange(index, newTupleValue);

                                          // Also update the overall validation state
                                          const newItems = [...arrayItems];
                                          newItems[index] = {
                                            value: newTupleValue,
                                            isValid: allFieldsValid
                                          };
                                          setArrayItems(newItems);

                                          // Check if all array items are valid
                                          const allValid = newItems.every(i => i.isValid);
                                          setIsValid(allValid);
                                          onChange(JSON.stringify(newItems.map(i => i.value)), allValid);
                                        } catch (e: unknown) {
                                          // If parsing fails, create a new object with just this field
                                          const isFieldValid = validateSingleValue(newValue, field.type);
                                          const newTupleValue = JSON.stringify({
                                            [field.name]: newValue
                                          });

                                          // Mark as invalid since we couldn't validate the whole tuple
                                          const newItems = [...arrayItems];
                                          newItems[index] = {
                                            value: newTupleValue,
                                            isValid: isFieldValid // At least check this field
                                          };
                                          setArrayItems(newItems);

                                          // Update validity state
                                          const allValid = newItems.every(i => i.isValid);
                                          setIsValid(allValid);

                                          handleArrayItemChange(index, newTupleValue);
                                          onChange(JSON.stringify(newItems.map(i => i.value)), allValid);
                                        }
                                      }}
                                      className="solidity-input__tuple-field-select"
                                    >
                                      <option value="true">true</option>
                                      <option value="false">false</option>
                                    </select>
                                  ) : (
                                    <div className="solidity-input__field-container">
                                      <input
                                        type={field.type.startsWith('uint') || field.type.startsWith('int') ? 'number' : 'text'}
                                        value={fieldValue}
                                        onChange={(e) => {
                                          const newValue = e.target.value;
                                          try {
                                            const tupleObj = JSON.parse(item.value);

                                            // Validate the field value first
                                            const isFieldValid = validateSingleValue(newValue, field.type);

                                            const newTupleValue = JSON.stringify({
                                              ...tupleObj,
                                              [field.name]: newValue
                                            });

                                            // Check if all fields in the tuple are valid
                                            const allFieldsValid = Object.keys({ ...tupleObj, [field.name]: newValue })
                                              .every(key => {
                                                const fieldDef = tupleStructure?.find(f => f.name === key);
                                                if (!fieldDef) return true; // Skip fields without definition
                                                // Special case for the current field
                                                if (key === field.name) return isFieldValid;
                                                // For other fields, validate their values
                                                return validateSingleValue(tupleObj[key], fieldDef.type);
                                              });

                                            // Update array item with new value and validity state
                                            handleArrayItemChange(index, newTupleValue);

                                            // Also update the overall validation state
                                            const newItems = [...arrayItems];
                                            newItems[index] = {
                                              value: newTupleValue,
                                              isValid: allFieldsValid
                                            };
                                            setArrayItems(newItems);

                                            // Check if all array items are valid
                                            const allValid = newItems.every(i => i.isValid);
                                            setIsValid(allValid);
                                            onChange(JSON.stringify(newItems.map(i => i.value)), allValid);
                                          } catch (e: unknown) {
                                            // If parsing fails, create a new object with just this field
                                            const isFieldValid = validateSingleValue(newValue, field.type);
                                            const newTupleValue = JSON.stringify({
                                              [field.name]: newValue
                                            });

                                            // Mark as invalid since we couldn't validate the whole tuple
                                            const newItems = [...arrayItems];
                                            newItems[index] = {
                                              value: newTupleValue,
                                              isValid: isFieldValid // At least check this field
                                            };
                                            setArrayItems(newItems);

                                            // Update validity state
                                            const allValid = newItems.every(i => i.isValid);
                                            setIsValid(allValid);

                                            handleArrayItemChange(index, newTupleValue);
                                            onChange(JSON.stringify(newItems.map(i => i.value)), allValid);
                                          }
                                        }}
                                        className="solidity-input__tuple-field-input"
                                        placeholder={`Enter ${field.type} value...`}
                                      />
                                      {field.type === 'address' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const zeroAddress = '0x0000000000000000000000000000000000000000';
                                            // For simple address arrays, we don't need to parse JSON objects
                                            // Just set the zero address directly
                                            const newItems = [...arrayItems];

                                            // Always consider zero address valid
                                            newItems[index] = {
                                              value: zeroAddress,
                                              isValid: true
                                            };

                                            // Update array items and component state
                                            setArrayItems(newItems);
                                            setIsValid(true);
                                            setError('');

                                            // Update parent
                                            handleArrayItemChange(index, zeroAddress);
                                            onChange(JSON.stringify(newItems.map(i => i.value)), true);
                                          }}
                                          className="solidity-input__zero-address-button"
                                          title="Set to zero address"
                                        >
                                          0x0
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="solidity-input__tuple-error">
                            Tuple structure undefined
                          </div>
                        )
                      }
                    </div>
                  </div>
                ) : baseType === 'bool' ? (
                  <div className="solidity-input__array-item-content">
                    <span className="solidity-input__array-index">{index}:</span>
                    <select
                      value={item.value}
                      onChange={(e) => handleArrayItemChange(index, e.target.value)}
                      className="solidity-input__select"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </div>
                ) : (
                  <div className="solidity-input__array-item-content">
                    <span className="solidity-input__array-index">{index}:</span>
                    <div className="solidity-input__field-container">
                      <input
                        type={getInputType()}
                        value={item.value}
                        onChange={(e) => handleArrayItemChange(index, e.target.value)}
                        className={`solidity-input__field ${!item.isValid ? 'solidity-input__field--error' : ''}`}
                        placeholder={`Enter ${baseType} value...`}
                      />
                      {baseType === 'address' && (
                        <button
                          type="button"
                          onClick={() => {
                            const zeroAddress = '0x0000000000000000000000000000000000000000';
                            // For simple address arrays, we don't need to parse JSON objects
                            // Just set the zero address directly
                            const newItems = [...arrayItems];

                            // Always consider zero address valid
                            newItems[index] = {
                              value: zeroAddress,
                              isValid: true
                            };

                            // Update array items and component state
                            setArrayItems(newItems);
                            setIsValid(true);
                            setError('');

                            // Update parent
                            handleArrayItemChange(index, zeroAddress);
                            onChange(JSON.stringify(newItems.map(i => i.value)), true);
                          }}
                          className="solidity-input__zero-address-button"
                          title="Set to zero address"
                        >
                          0x0
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeArrayItem(index)}
                  className="solidity-input__array-item-remove"
                  aria-label="Remove item"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        <div className="solidity-input__array-controls">
          <button
            type="button"
            onClick={addArrayItem}
            className="solidity-input__array-add-button"
          >
            {isTuple || isComplexTupleArray ? 'Add Tuple Item' : 'Add Item'}
          </button>
        </div>
      </div>
    );
  }

  // For basic non-array types
  return (
    <div className={`solidity-input ${className} ${!isValid ? 'solidity-input--error' : ''}`}>
      <div className="solidity-input__label">
        <span className="solidity-input__name">{name}</span>
        <span className="solidity-input__type">{type}</span>
      </div>

      {type === 'bool' ? (
        <select
          value={value}
          onChange={handleInputChange}
          className="solidity-input__select"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <div className="solidity-input__field-container">
          <input
            type={getInputType()}
            value={value}
            onChange={handleInputChange}
            className="solidity-input__field"
            placeholder={`Enter ${type} value...`}
          />
          {type === 'address' && (
            <button
              type="button"
              onClick={() => setComplexTupleAddressToZero(name)}
              className="solidity-input__zero-address-button"
              title="Set to zero address"
            >
              0x0
            </button>
          )}
        </div>
      )}

      {!isValid && error && (
        <div className="solidity-input__error">{error}</div>
      )}
    </div>
  );
};