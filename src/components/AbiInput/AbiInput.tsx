import React, { useState, useEffect } from 'react';
import './AbiInput.css';
import { parseAbiItem } from 'viem';
import { linearizeAbi, LinearizedParameter } from '../../helpers/linearizeAbi';
import { SolidityInput } from '../SolidityInput';

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
  /**
   * Callback when parameters are filled
   */
  onParamChange?: (params: Record<string, string>, isValid: boolean) => void;
}

export const AbiInput: React.FC<AbiInputProps> = ({
  abi = 'function transfer(address to, uint256 amount)',
  className = '',
  onChange,
  onParamChange,
  ...props
}) => {
  const [isValid, setIsValid] = useState<boolean>(true);
  const [abiObject, setAbiObject] = useState<ReturnType<typeof parseAbiItem>>();
  const [linearizedAbi, setLinearizedAbi] = useState<LinearizedParameter[]>([]);
  const [error, setError] = useState<string>('');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [paramValidity, setParamValidity] = useState<Record<string, boolean>>({});

  useEffect(() => {
    validateAbi(abi);
  }, []);

  useEffect(() => {
    console.log(abiObject);
  }, [abiObject]);

  useEffect(() => {
    if (linearizedAbi.length > 0) {
      // Initialize parameter values
      const initialValues: Record<string, string> = {};
      const initialValidity: Record<string, boolean> = {};

      linearizedAbi.forEach(param => {
        if (param.name) {
          initialValues[param.name] = '';
          // Tuple types don't need user input, so mark as valid initially
          const isTuple = param.type.startsWith('tuple') || param.type.includes('tuple[');
          initialValidity[param.name] = isTuple;
        }
      });

      setParamValues(initialValues);
      setParamValidity(initialValidity);
    }
  }, [linearizedAbi]);

  useEffect(() => {
    if (linearizedAbi.length > 0 && onParamChange) {
      const allValid = Object.values(paramValidity).every(valid => valid);
      onParamChange(paramValues, allValid);
    }
  }, [paramValues, paramValidity]);

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
      setLinearizedAbi(linearizeAbi(parsedAbi));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid ABI format');
      setIsValid(false);
      return false;
    }
  };

  const handleParamChange = (name: string, value: string, isValid: boolean) => {
    setParamValues(prev => ({ ...prev, [name]: value }));
    setParamValidity(prev => ({ ...prev, [name]: isValid }));
  };

  // Get CSS classes for a parameter
  const getParamClasses = (param: LinearizedParameter) => {
    const baseType = param.type.replace(/\[\d*\]$/, ''); // Remove array notation

    return [
      'abi-input__parameter',
      `abi-input__parameter--${baseType.replace(/\d+/g, '')}`,
      `abi-input__parameter--depth-${param.depth}`
    ].filter(Boolean).join(' ');
  };

  return (
    <div className={`abi-input ${className}`} {...props}>
      {abiObject && (
        <div className="abi-input__header">
          <h3 className="abi-input__function-name">
            {(abiObject as any).name || 'Anonymous Function'}
          </h3>
        </div>
      )}

      {linearizedAbi.length > 0 && (
        <div className="abi-input__parameters">
          <h4 className="abi-input__parameters-title">Parameters</h4>
          {linearizedAbi.filter(param => param.name).map((param) => (
            <div key={param.name} className="abi-input__parameter-wrapper">
              <SolidityInput
                key={param.name}
                type={param.type}
                name={param.name || `param${param.type}`}
                value={param.name ? (paramValues[param.name] || '') : ''}
                onChange={(value, isValid) => param.name && handleParamChange(param.name, value, isValid)}
                className={getParamClasses(param)}
              />
            </div>
          ))}
        </div>
      )}

      {!isValid && error && (
        <div className="abi-input__error">{error}</div>
      )}
    </div>
  );
}; 