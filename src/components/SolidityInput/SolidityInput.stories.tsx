import React, { useState } from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { SolidityInput, SolidityInputProps } from './SolidityInput';

const meta: Meta<typeof SolidityInput> = {
  title: 'Components/SolidityInput',
  component: SolidityInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SolidityInput>;

// Wrapper component to handle state
const SolidityInputWrapper = (args: SolidityInputProps) => {
  const [value, setValue] = useState(args.value || '');
  const [isValid, setIsValid] = useState(true);

  const handleChange = (newValue: string, valid: boolean) => {
    setValue(newValue);
    setIsValid(valid);
    console.log(`Value: ${newValue}, Valid: ${valid}`);
  };

  return (
    <div style={{ width: '400px' }}>
      <SolidityInput {...args} value={value} onChange={handleChange} />
      <div style={{ marginTop: '10px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Current value: <code>{value}</code></span>
        <span>Valid: <code>{isValid.toString()}</code></span>
      </div>
    </div>
  );
};

// Basic Solidity Types
export const Uint256: Story = {
  render: (args) => <SolidityInputWrapper {...args} />,
  args: {
    type: 'uint256',
    name: 'amount',
    value: '1000000000000000000',
  },
};

export const Uint8: Story = {
  render: (args) => <SolidityInputWrapper {...args} />,
  args: {
    type: 'uint8',
    name: 'decimals',
    value: '18',
  },
};

export const Int256: Story = {
  render: (args) => <SolidityInputWrapper {...args} />,
  args: {
    type: 'int256',
    name: 'signedAmount',
    value: '-5000',
  },
};

export const Address: Story = {
  render: (args) => <SolidityInputWrapper {...args} />,
  args: {
    type: 'address',
    name: 'recipient',
    value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  },
};

export const Bool: Story = {
  render: (args) => <SolidityInputWrapper {...args} />,
  args: {
    type: 'bool',
    name: 'allowMinting',
    value: 'true',
  },
};

export const String: Story = {
  render: (args) => <SolidityInputWrapper {...args} />,
  args: {
    type: 'string',
    name: 'tokenName',
    value: 'My NFT Collection',
  },
};

export const Bytes: Story = {
  render: (args) => <SolidityInputWrapper {...args} />,
  args: {
    type: 'bytes',
    name: 'data',
    value: '0x1234567890abcdef',
  },
};

export const Bytes32: Story = {
  render: (args) => <SolidityInputWrapper {...args} />,
  args: {
    type: 'bytes32',
    name: 'hash',
    value: '0x0000000000000000000000000000000000000000000000000000000000000001',
  },
};

export const WithError: Story = {
  render: (args) => <SolidityInputWrapper {...args} />,
  args: {
    type: 'uint256',
    name: 'amount',
    value: 'not a number',
  },
}; 