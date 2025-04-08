import React, { useState, useEffect, useMemo } from 'react';
import './AbiInput.css';
import { parseAbiItem } from 'viem';
import { linearizeAbi, LinearizedParameter } from '../../helpers/linearizeAbi';
import { combineTx } from '../../helpers/combineTx';
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
  const [valuePreview, setValuePreview] = useState<string>('');
  const [previewUpdated, setPreviewUpdated] = useState<boolean>(false);
  const [functionSignature, setFunctionSignature] = useState<string>('');
  const [bytecode, setBytecode] = useState<string>('');

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
          const isString = param.type === 'string';
          initialValidity[param.name] = isTuple || isString;
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

    // Update the value preview whenever parameters change
    updateValuePreview();

    // Generate bytecode if all parameters are valid
    generateBytecode();

    // Trigger animation when preview updates
    if (Object.keys(paramValues).length > 0) {
      setPreviewUpdated(true);
      const timer = setTimeout(() => setPreviewUpdated(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [paramValues, paramValidity, functionSignature]);

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

      // Generate and store the function signature
      const functionName = (parsedAbi as any).name || 'anonymousFunction';
      const inputParams = (parsedAbi as any).inputs
        ? (parsedAbi as any).inputs.map((input: any) => `${input.type}${input.name ? ' ' + input.name : ''}`).join(', ')
        : '';
      setFunctionSignature(`${functionName}(${inputParams})`);

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

  // Format value for preview based on type
  const formatValueForPreview = (value: string, type: string): string => {
    if (type === 'string') {
      return `"${value}"`;
    }

    // Handle empty values
    if (value === '[]') {
      return '[]';
    }

    // Format arrays
    if (type.includes('[')) {
      try {
        const baseType = type.replace(/\[\d*\]$/, '');
        const parsedArray = JSON.parse(value);
        if (!Array.isArray(parsedArray)) return '[]';

        // Format each item based on base type
        const formattedItems = parsedArray.map(item => {
          if (baseType.startsWith('string')) {
            return `"${item}"`;
          } else if (baseType.startsWith('tuple')) {
            return '(...)'; // Simplified tuple representation
          } else {
            return item;
          }
        });

        return `[${formattedItems.join(', ')}]`;
      } catch (e) {
        return '[]';
      }
    }

    // Format string values with quotes
    if (type === 'string') {
      return `"${value}"`;
    }

    // Format tuples
    if (type.startsWith('tuple')) {
      // throw error - this shouldn't be called
      throw new Error('Tuple types should not be formatted');
    }

    // Return as is for numeric types, addresses, etc.
    return value;
  };

  // Generate the parameter preview string
  const updateValuePreview = () => {
    if (linearizedAbi.length === 0) {
      setValuePreview('');
      return;
    }

    // Get top-level parameters only (depth 0)
    const rootParams = linearizedAbi.filter(param => param.depth === 0 && param.name);
    if (rootParams.length === 0) {
      setValuePreview('');
      return;
    }

    // Format each parameter value
    const formattedValues = rootParams.map(param => {
      const value = param.name ? paramValues[param.name] || '' : '';
      return formatValueForPreview(value, param.type);
    });

    setValuePreview(formattedValues.join(', '));
  };

  // Generate bytecode using combineTx
  const generateBytecode = () => {
    if (!functionSignature || !isFormValid || valuePreview === '') {
      console.log(functionSignature, isFormValid, valuePreview);
      setBytecode('');
      return;
    }

    try {
      // Pass just the function signature without the "function" keyword
      // The combineTx function will handle adding it if necessary
      console.log('Using signature for bytecode generation:', functionSignature);
      const calldata = combineTx(functionSignature, valuePreview);
      setBytecode(calldata);
    } catch (error) {
      console.error('Error generating bytecode:', error);
      setBytecode('');
    }
  };

  // Is the form fully valid (all inputs are valid)?
  const isFormValid = useMemo(() => {
    console.log('paramValidity', paramValidity);
    return Object.values(paramValidity).every(Boolean);
  }, [paramValidity]);

  return (
    <div className={`abi-input ${className}`} {...props}>
      {abiObject && (
        <div className="abi-input__header">
          <h3 className="abi-input__function-name">
            {(abiObject as any).name || 'Anonymous Function'}
          </h3>
        </div>
      )}

      {isFormValid && (
        <div className={`abi-input__preview ${isFormValid ? 'abi-input__preview--valid' : 'abi-input__preview--invalid'} ${previewUpdated ? 'abi-input__preview--updated' : ''}`}>
          <div className="abi-input__preview-content">
            <div className="abi-input__preview-signature">
              <span className="abi-input__preview-label">Signature:</span>
              <code className="abi-input__preview-value">{functionSignature}</code>
            </div>
            {valuePreview && (
              <div className="abi-input__preview-values">
                <span className="abi-input__preview-label">Values:</span>
                <code className="abi-input__preview-value">{valuePreview}</code>
              </div>
            )}
            {bytecode && (
              <div className="abi-input__preview-bytecode">
                <span className="abi-input__preview-label">Bytecode:</span>
                <code className="abi-input__preview-value abi-input__preview-value--bytecode">
                  {bytecode}
                </code>
              </div>
            )}
          </div>
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