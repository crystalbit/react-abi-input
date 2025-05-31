import React, { useState, useEffect, useMemo } from 'react';
import './AbiInput.css';
import { parseAbiItem } from 'viem';
import { linearizeAbi, LinearizedParameter } from '../../helpers/linearizeAbi';
import { combineTx } from '../../helpers/combineTx';
import { SolidityInput } from '../SolidityInput';
import { parseTypeSignature } from './helpers/methods';

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
  onChange?: (values: Record<string, string>, bytecode: string) => void;
}

export const AbiInput: React.FC<AbiInputProps> = ({
  abi = 'function transfer(address to, uint256 amount)',
  className = '',
  onChange,
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

  // Is the form fully valid (all inputs are valid)?
  const isFormValid = useMemo(() => {
    // First check if all fields are valid according to their individual validations
    const allFieldsValid = Object.values(paramValidity).every(Boolean);

    // If basic validation fails, no need to try bytecode generation
    if (!allFieldsValid || !functionSignature || valuePreview.length === 0) {
      return false;
    }

    // Try to generate bytecode as the ultimate validation
    try {
      // If we can generate bytecode, the form is valid
      combineTx(functionSignature, valuePreview);
      return true;
    } catch (error) {
      console.log('Form validation failed during bytecode generation:', error);
      return false;
    }
  }, [paramValidity, functionSignature, valuePreview]);

  useEffect(() => {
    validateAbi(abi);
  }, []);

  useEffect(() => {
    if (linearizedAbi.length > 0) {
      // Initialize parameter values
      const initialValues: Record<string, string> = {};
      const initialValidity: Record<string, boolean> = {};

      linearizedAbi.forEach(param => {
        if (param.name) {
          initialValues[param.name] = '';
          // Tuple types don't need user input, so mark as valid initially
          const isTuple = param.type.startsWith('tuple') || param.type.includes('tuple[') ||
            (param.type.startsWith('(') && param.type.includes(')'));
          const isString = param.type === 'string';
          initialValidity[param.name] = isTuple || isString;
        }
      });

      setParamValues(initialValues);
      setParamValidity(initialValidity);
    }
  }, [linearizedAbi]);

  // Trigger animation when preview updates
  useEffect(() => {
    if (Object.keys(paramValues).length > 0) {
      setPreviewUpdated(true);
      const timer = setTimeout(() => setPreviewUpdated(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [paramValues]);

  // Reset animation flag when done
  useEffect(() => {
    if (previewUpdated) {
      setPreviewUpdated(false);
    }
  }, [previewUpdated]);

  // If the ABI changes, we need to reset parameter values
  useEffect(() => {
    validateAbi(abi);
  }, [abi]);

  // Generate bytecode when form is valid and params change
  useEffect(() => {
    // Only try to generate bytecode if we have all the needed data
    if (isFormValid && functionSignature && valuePreview) {
      try {
        const calldata = combineTx(functionSignature, valuePreview);
        setBytecode(calldata);

        // Call onChange with updated values and bytecode
        if (onChange) {
          onChange(paramValues, calldata);
        }
      } catch (error) {
        // This should rarely happen since we already validated in isFormValid
        console.error('Error generating bytecode:', error);
        setBytecode('');

        // Call onChange with empty bytecode on error
        if (onChange) {
          onChange(paramValues, '');
        }
      }
    } else {
      setBytecode('');

      // Call onChange with empty bytecode when not ready
      if (onChange) {
        onChange(paramValues, '');
      }
    }
  }, [isFormValid, functionSignature, valuePreview, paramValues, onChange]);

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
      console.log("PARSED ABI", parsedAbi)
      setLinearizedAbi(linearizeAbi(parsedAbi));

      // Generate and store the function signature with proper tuple destructuring
      const functionName = (parsedAbi as any).name || 'anonymousFunction';
      const inputParams = (parsedAbi as any).inputs
        ? (parsedAbi as any).inputs.map((input: any) => {
          // Handle tuple types with proper destructuring
          if (input.type === 'tuple' || input.type.startsWith('tuple[')) {
            // Format the tuple type based on components
            const formattedType = formatTupleTypeWithComponents(input);
            return `${formattedType}${input.name ? ' ' + input.name : ''}`;
          }
          return `${input.type}${input.name ? ' ' + input.name : ''}`;
        }).join(', ')
        : '';
      setFunctionSignature(`${functionName}(${inputParams})`);

      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid ABI format');
      setIsValid(false);
      return false;
    }
  };

  // Helper function to format tuple types with their components
  const formatTupleTypeWithComponents = (input: any): string => {
    if (!input.components || input.components.length === 0) {
      return input.type;
    }

    const componentsStr = input.components.map((comp: any) => {
      if (comp.type === 'tuple' || comp.type.startsWith('tuple[')) {
        const nestedTuple = formatTupleTypeWithComponents(comp);
        return `${nestedTuple} ${comp.name || ''}`.trim();
      }
      return `${comp.type} ${comp.name || ''}`.trim();
    }).join(', ');

    // Format based on whether it's a tuple or tuple array
    if (input.type === 'tuple') {
      return `(${componentsStr})`;
    } else if (input.type.startsWith('tuple[')) {
      const arrayPart = input.type.substring(5); // Extract the array brackets
      return `(${componentsStr})${arrayPart}`;
    }

    return input.type;
  };

  const handleParamChange = (name: string, value: string, isValid: boolean) => {
    // Update parameter values
    setParamValues(prev => ({
      ...prev,
      [name]: value
    }));

    // Update parameter validity
    setParamValidity(prev => ({
      ...prev,
      [name]: isValid
    }));

    // Update the value preview with the new parameter values
    const updatedParamValues = {
      ...paramValues,
      [name]: value
    };

    // Generate formatted parameter preview
    const rootParams = linearizedAbi.filter(param => (!param.path || param.path === '') && param.name);
    console.log("ROOT PARAMS", rootParams)
    const formattedValues = rootParams.map(param => {
      const paramValue = param.name ? updatedParamValues[param.name] || '' : '';
      return formatValueForPreview(paramValue, param.type);
    });
    console.log("FORMATTED VALUES", formattedValues)

    setValuePreview(formattedValues.join(', '));
    setPreviewUpdated(true);
  };

  // Get CSS classes for a parameter
  const getParamClasses = (param: LinearizedParameter) => {
    const baseType = param.type.replace(/\[\d*\]$/, ''); // Remove array notation

    return [
      'abi-input__parameter',
      `abi-input__parameter--${baseType.replace(/\d+/g, '')}`,
      param.path ? `abi-input__parameter--path-${param.path.replace(/\./g, '-')}` : ''
    ].filter(Boolean).join(' ');
  };

  // Helper function to format tuple values as (val1, val2, (nestedVal1, nestedVal2))
  const formatTuple = (tupleValue: string): string => {
    // If already formatted as tuple string, return as is
    if (typeof tupleValue === 'string' && tupleValue.startsWith('(') && tupleValue.endsWith(')')) {
      return tupleValue;
    }

    const tupleObj = typeof tupleValue === 'string' ? JSON.parse(tupleValue) : tupleValue;

    // If empty object or not an object, return empty tuple
    if (!tupleObj || typeof tupleObj !== 'object' || Array.isArray(tupleObj)) {
      return '()';
    }

    // For tuple display, we need to put the properties in the correct order
    // First, extract all the keys that look like inner tuples
    const tupleKeys = Object.keys(tupleObj).filter(key => {
      const val = tupleObj[key];
      return typeof val === 'string' && val.startsWith('{') && val.endsWith('}');
    });

    // Then get all other keys
    const otherKeys = Object.keys(tupleObj).filter(key => !tupleKeys.includes(key));

    // Process nested tuples first
    const nestedTupleValues = tupleKeys.map(key => {
      try {
        return formatTuple(tupleObj[key]);
      } catch (e) {
        return '(...)';
      }
    });

    // Process other values
    const otherValues = otherKeys.map(key => {
      const val = tupleObj[key];
      if (typeof val === 'string') {
        if (val === 'true' || val === 'false' || !isNaN(Number(val))) {
          // Booleans and numbers
          return val;
        } else if (val.startsWith('"') && val.endsWith('"')) {
          // Already quoted string
          return val;
        } else {
          // Regular string, add quotes
          return `"${val}"`;
        }
      } else {
        // Other values (number, boolean, etc.)
        return String(val);
      }
    });

    // Combine all values - put simple values first, then nested tuples
    const allValues = [...otherValues, ...nestedTupleValues];

    return `(${allValues.join(', ')})`;
  };

  // Format value for preview based on type
  const formatValueForPreview = (value: string, type: string): string => {
    console.log("FORMATTING VALUE FOR PREVIEW", { value, type })
    // Handle string values as empty string is valid
    if (type === 'string') {
      return `"${value}"`;
    }

    if (!value) return '';

    // Handle empty values
    if (value === '[]') {
      return '[]';
    }

    // Special handling for formatted tuple type signatures
    // Extract tuple structure for correct ordering
    if (type.startsWith('(') && type.endsWith(')')) {
      try {
        const formatted = formatTupleWithStructure(value, type);
        console.log("FORMATTED", formatted)
        return formatted;
      } catch (e) {
        console.error('Error formatting tuple with structure:', e);
        return formatTuple(value); // Fallback to regular formatting
      }
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
          } else if (baseType.startsWith('tuple') || baseType.startsWith('(')) {
            // For tuple arrays, format each tuple
            try {
              return formatTuple(item);
            } catch (e) {
              return '(...)';
            }
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

    // Format tuples with tuple notation (a, b, c)
    if (type.startsWith('tuple') || type.startsWith('(')) {
      try {
        return formatTuple(value);
      } catch (e) {
        return '()';
      }
    }

    // Return as is for numeric types, addresses, etc.
    return value;
  };

  // Format tuple values according to the structure in the type signature
  const formatTupleWithStructure = (value: string, typeSignature: string): string => {
    console.log("FORMATTING TUPLE WITH STRUCTURE", { value, typeSignature })
    const tupleObj = typeof value === 'string' ? JSON.parse(value) : value;
    if (!tupleObj || typeof tupleObj !== 'object' || Array.isArray(tupleObj)) {
      return '()';
    }
    console.log("TUPLE OBJ", tupleObj)

    // Parse the tuple structure from type signature
    // Example: "(uint256 a, (uint256 b, uint256 ccc) param1)"
    const typesWithNames = parseTypeSignature(typeSignature);
    console.log("TYPES WITH NAMES", typesWithNames)
    if (!typesWithNames.length) return formatTuple(value);

    // Format values according to the structure
    const formattedValues = [];

    for (const { type, name } of typesWithNames) {
      if (!name || !(name in tupleObj)) {
        // If name not in object, add placeholder
        formattedValues.push('...');
        continue;
      }

      const val = tupleObj[name];

      // Handle nested tuples
      if (type.startsWith('(') && type.endsWith(')')) {
        try {
          formattedValues.push(formatTupleWithStructure(val, type));
        } catch (e) {
          formattedValues.push(formatTuple(val));
        }
      }
      // Handle normal values
      else if (typeof val === 'string') {
        if (type === 'string') {
          formattedValues.push(`"${val.replace(/^"|"$/g, '')}"`);
        } else if (val === 'true' || val === 'false' || !isNaN(Number(val))) {
          formattedValues.push(val);
        } else {
          formattedValues.push(val);
        }
      } else {
        formattedValues.push(String(val));
      }
    }

    return `(${formattedValues.join(', ')})`;
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

      <div className={`abi-input__preview ${isFormValid ? 'abi-input__preview--valid' : 'abi-input__preview--invalid'} ${previewUpdated ? 'abi-input__preview--updated' : ''}`}>
        <div className="abi-input__preview-content">
          <div className="abi-input__preview-signature">
            <span className="abi-input__preview-label">Signature:</span>
            <code className="abi-input__preview-value">{functionSignature || 'No signature available'}</code>
          </div>

          {isFormValid && (
            <div className="abi-input__preview-values">
              <span className="abi-input__preview-label">Values:</span>
              <code className="abi-input__preview-value">
                {valuePreview || (linearizedAbi.length > 0 ? 'Fill in parameters to see values' : 'No parameters')}
              </code>
            </div>
          )}

          <div className="abi-input__preview-bytecode">
            <span className="abi-input__preview-label">Bytecode:</span>
            <code className="abi-input__preview-value abi-input__preview-value--bytecode">
              {isFormValid && bytecode ? bytecode : (isFormValid && linearizedAbi.length > 0 ? 'Waiting for valid inputs...' : 'No bytecode generated')}
            </code>
          </div>
        </div>
      </div>

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