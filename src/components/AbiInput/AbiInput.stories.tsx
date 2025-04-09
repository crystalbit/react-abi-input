import type { Meta, StoryObj } from '@storybook/react';
import { AbiInput } from './AbiInput';

const meta = {
  title: 'Components/AbiInput',
  component: AbiInput,
  tags: ['autodocs'],
  argTypes: {
    abi: {
      control: 'text',
      description: 'ABI of the method',
    },
    onChange: {
      action: 'values changed',
      description: 'Callback when any input value changes',
    },
  },
} satisfies Meta<typeof AbiInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    abi: "function transfer(address from, address to, uint256 value)",
  },
};

export const Approve: Story = {
  args: {
    abi: "function approve(address spender, uint256 value)",
  },
};

export const Nested: Story = {
  args: {
    abi: "function deployCode(string memory what, (uint256 a, (uint256 b, (uint256 c, uint256 d))))",
  },
};

// Arrays of basic types
export const ArraysOfBasicTypes: Story = {
  args: {
    abi: "function deployCode(string memory what, uint256[] a, address[] b)",
  },
};


// Nested with array of tuples
export const NestedWithArrayOfTuples: Story = {
  args: {
    abi: "function arrayWithTuple(string memory what, (uint256 b, address c)[] bcArray)",
  },
};

export const EmptyAbi: Story = {
  args: {
    abi: "",
  },
};

export const WrongAbi: Story = {
  args: {
    abi: "function deployCode(string0 memory what, bytes memory args)",
  },
};

// event ABI
export const EventAbi: Story = {
  args: {
    abi: "event Transfer(address indexed from, address indexed to, uint256 value)",
  },
};

