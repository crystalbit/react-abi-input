# react-abi

A modern React component library built with TypeScript.

## Installation

```bash
npm install react-abi
# or
yarn add react-abi
```

## Usage

```tsx
import { AbiInput } from 'react-abi';

function App() {
  return (
    <div>
      <AbiInput 
        count={3} 
        placeholder="Field" 
        onChange={(values) => console.log('Values:', values)}
      />
    </div>
  );
}
```

## Components

### AbiInput

A component that renders multiple input fields based on a count parameter.

```tsx
import { AbiInput } from 'react-abi';

<AbiInput 
  count={5} 
  placeholder="Enter value" 
  onChange={(values) => console.log('Input values:', values)}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| count | number | 1 | Number of input fields to display |
| placeholder | string | 'Enter value' | Placeholder text for the inputs |
| onChange | (values: string[]) => void | - | Callback function called when any input value changes |
| className | string | '' | Additional CSS class names |

## Development

### Setup

```bash
git clone https://github.com/yourusername/react-abi.git
cd react-abi
npm install
```

### Running Storybook

```bash
npm run storybook
```

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

## License

MIT 