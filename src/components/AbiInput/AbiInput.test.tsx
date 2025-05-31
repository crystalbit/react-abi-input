/**
 * Tests for the parseTypeSignature function from AbiInput component
 * 
 * This function parses Solidity tuple type signatures into an array of type and name objects
 */

import { parseTypeAndName, parseTypeSignature } from "./helpers/methods";


describe('parseTypeSignature function', () => {
  test('parses simple tuple type signatures', () => {
    const result = parseTypeSignature('(uint256 a, address b)');
    expect(result).toEqual([
      { type: 'uint256', name: 'a' },
      { type: 'address', name: 'b' }
    ]);
  });

  test('parses tuple type signatures without names', () => {
    const result = parseTypeSignature('(uint256, address)');
    expect(result).toEqual([
      { type: 'uint256', name: '' },
      { type: 'address', name: '' }
    ]);
  });

  test('parses tuple type signatures with mixed named and unnamed parameters', () => {
    const result = parseTypeSignature('(uint256 a, address, bool flag)');
    expect(result).toEqual([
      { type: 'uint256', name: 'a' },
      { type: 'address', name: '' },
      { type: 'bool', name: 'flag' }
    ]);
  });

  test('parses nested tuple type signatures', () => {
    const result = parseTypeSignature('(uint256 a, (uint256 b, address c) nestedTuple, bool flag)');
    expect(result).toEqual([
      { type: 'uint256', name: 'a' },
      { type: '(uint256 b, address c)', name: 'nestedTuple' },
      { type: 'bool', name: 'flag' }
    ]);
  });

  test('handles deeply nested tuple type signatures', () => {
    const result = parseTypeSignature('(uint256 a, (uint256 b, (address c, bool d) deepNested) nestedTuple, string e)');
    expect(result).toEqual([
      { type: 'uint256', name: 'a' },
      { type: '(uint256 b, (address c, bool d) deepNested)', name: 'nestedTuple' },
      { type: 'string', name: 'e' }
    ]);
  });

  test('handles complex type names with spaces', () => {
    const result = parseTypeSignature('(uint256 amount, fixed128x18 price)');
    expect(result).toEqual([
      { type: 'uint256', name: 'amount' },
      { type: 'fixed128x18', name: 'price' }
    ]);
  });

  test('handles empty tuple', () => {
    const result = parseTypeSignature('()');
    expect(result).toEqual([]);
  });

  test('handles whitespace', () => {
    const result = parseTypeSignature('(  uint256   firstParam  ,  address   secondParam  )');
    expect(result).toEqual([
      { type: 'uint256', name: 'firstParam' },
      { type: 'address', name: 'secondParam' }
    ]);
  });

  test('handles tuple array types', () => {
    const result = parseTypeSignature('(uint256[] amounts, address[] recipients)');
    expect(result).toEqual([
      { type: 'uint256[]', name: 'amounts' },
      { type: 'address[]', name: 'recipients' }
    ]);
  });

  test('handles nested tuple array types', () => {
    const result = parseTypeSignature('(uint256 amount, (address user, uint256 value)[] nestedArray)');
    expect(result).toEqual([
      { type: 'uint256', name: 'amount' },
      { type: '(address user, uint256 value)[]', name: 'nestedArray' }
    ]);
  });

  test('handles complex array dimensions', () => {
    const result = parseTypeSignature('(uint256[3] fixedArray, address[][] dynamicArray)');
    expect(result).toEqual([
      { type: 'uint256[3]', name: 'fixedArray' },
      { type: 'address[][]', name: 'dynamicArray' }
    ]);
  });

  test('handles single parameter', () => {
    const result = parseTypeSignature('(uint256 singleParam)');
    expect(result).toEqual([
      { type: 'uint256', name: 'singleParam' }
    ]);
  });
});

// Tests for the helper function parseTypeAndName
describe('parseTypeAndName function', () => {
  test('parses simple type without name', () => {
    const result = parseTypeAndName('uint256');
    expect(result).toEqual({ type: 'uint256', name: '' });
  });

  test('parses type with name', () => {
    const result = parseTypeAndName('uint256 amount');
    expect(result).toEqual({ type: 'uint256', name: 'amount' });
  });

  test('parses complex type with name', () => {
    const result = parseTypeAndName('address payable owner');
    expect(result).toEqual({ type: 'address payable', name: 'owner' });
  });

  test('parses tuple type with name', () => {
    const result = parseTypeAndName('(uint256 a, address b) nestedTuple');
    expect(result).toEqual({ type: '(uint256 a, address b)', name: 'nestedTuple' });
  });

  test('handles extra whitespace', () => {
    const result = parseTypeAndName('  uint256   amount  ');
    expect(result).toEqual({ type: 'uint256', name: 'amount' });
  });

  test('handles array types', () => {
    const result = parseTypeAndName('uint256[] amounts');
    expect(result).toEqual({ type: 'uint256[]', name: 'amounts' });
  });

  test('handles fixed array types', () => {
    const result = parseTypeAndName('uint256[3] fixedArray');
    expect(result).toEqual({ type: 'uint256[3]', name: 'fixedArray' });
  });
}); 