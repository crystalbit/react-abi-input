import React, { useState, useEffect } from 'react';
import './AbiInput.css';
import { parseAbiItem } from 'viem';

export interface AbiInputProps {
  /**
   * The ABI of the method
   */
abi: string;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Callback when the ABI value changes
   */
  onChange?: (value: string, isValid: boolean) => void;
}

export const AbiInput: React.FC<AbiInputProps> = ({
  abi = 'function transfer(address to, uint256 amount)',
  className = '',
  onChange,
  ...props
}) => {
  const [isValid, setIsValid] = useState<boolean>(true);
  const [abiObject, setAbiObject] = useState<ReturnType<typeof parseAbiItem>>();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    validateAbi(abi);
  }, []);

  useEffect(() => {
    console.log(abiObject);
  }, [abiObject]);

  const validateAbi = (abiString: string): boolean => {
    if (!abiString.trim()) {
      setError('ABI cannot be empty');
      setIsValid(false);
      return false;
    }

    try {
      const parsedAbi = parseAbiItem(abiString);
      if (!parsedAbi) {
        setError('Invalid ABI format');
        setIsValid(false);
        return false;
      }

      if (parsedAbi.type !== 'function') {
        setError('ABI must be a function');
        setIsValid(false);
        return false;
      }

      setError('');
      setIsValid(true);
      setAbiObject(parsedAbi);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid ABI format');
      setIsValid(false);
      return false;
    }
  };

  return (
    <div className={`abi-input ${className}`} {...props}>

      {!isValid && error && (
        <div className="abi-input__error">{error}</div>
      )}
    </div>
  );
}; 