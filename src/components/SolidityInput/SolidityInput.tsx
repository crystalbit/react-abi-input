import React, { useState, useEffect } from 'react';
import './SolidityInput.css';

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
}

export const SolidityInput: React.FC<SolidityInputProps> = ({
  type,
  name,
  value = '',
  onChange,
  className = '',
  ...props
}) => {
  const [isValid, setIsValid] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isTuple, setIsTuple] = useState<boolean>(false);
  const [isArray, setIsArray] = useState<boolean>(false);
  const [arrayItems, setArrayItems] = useState<{ value: string; isValid: boolean }[]>([]);
  const [baseType, setBaseType] = useState<string>('');

  useEffect(() => {
    // Determine if type is array and get base type
    const isArrayType = type.includes('[');
    setIsArray(isArrayType);

    // Remove array notation to get base type
    const extractedBaseType = type.replace(/\[\d*\]$/, '');
    setBaseType(extractedBaseType);

    // Check if base type is tuple
    const isTupleType = extractedBaseType === 'tuple';
    setIsTuple(isTupleType);

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
              isValid: validateSingleValue(String(item), extractedBaseType)
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
              isValid: validateSingleValue(String(item), baseType)
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
  }, [value, isArray]);

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
    const isItemValid = validateSingleValue(newValue, baseType);
    newItems[index] = { value: newValue, isValid: isItemValid };
    setArrayItems(newItems);
  };

  const addArrayItem = () => {
    let defaultValue = '';

    // Set sensible default values based on type
    if (baseType.startsWith('uint')) {
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

  // For tuple types, we don't show an input field as values come from nested components
  if (isTuple && !isArray) {
    return (
      <div className={`solidity-input ${className} solidity-input--tuple`}>
        <div className="solidity-input__label">
          <span className="solidity-input__name">{name}</span>
          <span className="solidity-input__type">{type}</span>
        </div>
        <div className="solidity-input__tuple-placeholder">
          Tuple
        </div>
      </div>
    );
  }

  // For array types, including arrays of tuples
  if (isArray) {
    return (
      <div className={`solidity-input ${className} solidity-input--array ${isTuple ? 'solidity-input--tuple-array' : ''}`}>
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
            arrayItems.map((item, index) => (
              <div key={index} className={`solidity-input__array-item ${!item.isValid ? 'solidity-input__array-item--error' : ''}`}>
                {isTuple ? (
                  <div className="solidity-input__tuple-array-item">
                    <span className="solidity-input__array-index">{index}:</span>
                    <div className="solidity-input__tuple-placeholder">
                      Tuple
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
                    <input
                      type={getInputType()}
                      value={item.value}
                      onChange={(e) => handleArrayItemChange(index, e.target.value)}
                      className="solidity-input__field"
                      placeholder={`Enter ${baseType} value...`}
                    />
                    {baseType === 'address' && (
                      <button
                        type="button"
                        onClick={() => setArrayItemZeroAddress(index)}
                        className="solidity-input__zero-address-button"
                        title="Set to zero address"
                      >
                        0x0
                      </button>
                    )}
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

          <div className="solidity-input__array-controls">
            <button
              type="button"
              onClick={addArrayItem}
              className="solidity-input__array-add-button"
            >
              Add Item
            </button>
          </div>
        </div>

        {!isValid && error && (
          <div className="solidity-input__error">{error}</div>
        )}
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
              onClick={setZeroAddress}
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