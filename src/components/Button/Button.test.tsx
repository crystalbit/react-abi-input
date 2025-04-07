import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from './Button';

describe('Button', () => {
  test('renders the button component', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('handles clicks', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('renders different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('abi-button--primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByText('Secondary')).toHaveClass('abi-button--secondary');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByText('Outline')).toHaveClass('abi-button--outline');
  });

  test('renders different sizes', () => {
    const { rerender } = render(<Button size="small">Small</Button>);
    expect(screen.getByText('Small')).toHaveClass('abi-button--small');

    rerender(<Button size="medium">Medium</Button>);
    expect(screen.getByText('Medium')).toHaveClass('abi-button--medium');

    rerender(<Button size="large">Large</Button>);
    expect(screen.getByText('Large')).toHaveClass('abi-button--large');
  });

  test('applies disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
}); 