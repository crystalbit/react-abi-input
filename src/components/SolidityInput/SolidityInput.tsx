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

  useEffect(() => {
    // Check if type is a tuple or array of tuples
    const baseType = type.replace(/\[\d*\]$/, ''); // Remove array notation
    setIsTuple(type.startsWith('tuple') || baseType === 'tuple');

    // For tuple types, auto-validate as valid (actual values come from nested components)
    if (isTuple) {
      setIsValid(true);
      setError('');
      onChange(value, true);
    } else {
      validateInput(value);
    }
  }, [value, type, isTuple]);

  // Function to validate input based on Solidity type
  const validateInput = (inputValue: string): boolean => {
    // Skip validation for tuple types
    if (isTuple) {
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

  const getInputType = () => {
    if (type.startsWith('uint') || type.startsWith('int')) {
      return 'number';
    } else if (type === 'bool') {
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

  // For tuple types, we don't show an input field as values come from nested components
  if (isTuple) {
    return (
      <div className={`solidity-input ${className} solidity-input--tuple`}>
        <div className="solidity-input__label">
          <span className="solidity-input__name">{name}</span>
          <span className="solidity-input__type">{type}</span>
        </div>
        <div className="solidity-input__tuple-placeholder">
          {type.includes('[') ? 'Array of tuples' : 'Tuple'}
        </div>
      </div>
    );
  }

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
        <input
          type={getInputType()}
          value={value}
          onChange={handleInputChange}
          className="solidity-input__field"
          placeholder={`Enter ${type} value...`}
        />
      )}

      {!isValid && error && (
        <div className="solidity-input__error">{error}</div>
      )}
    </div>
  );
}; 