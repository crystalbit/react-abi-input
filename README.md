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
import { Button } from 'react-abi';

function App() {
  return (
    <div>
      <Button onClick={() => console.log('Button clicked!')}>
        Click me
      </Button>
    </div>
  );
}
```

## Components

### Button

A customizable button component.

```tsx
import { Button } from 'react-abi';

<Button 
  variant="primary" 
  size="medium" 
  onClick={() => console.log('Clicked!')}
>
  Click me
</Button>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'outline' | 'primary' | Button style variant |
| size | 'small' \| 'medium' \| 'large' | 'medium' | Button size |
| disabled | boolean | false | Whether the button is disabled |
| onClick | () => void | - | Click handler |

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