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

export const DeployCode: Story = {
  args: {
    abi: "function deployCode(string memory what, bytes memory args)",
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

