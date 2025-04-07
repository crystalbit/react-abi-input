/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  webpackFinal: async (config) => {
    // Configure MDX
    const mdxRule = config.module.rules.find(
      (rule) => rule.test && rule.test.toString().includes('mdx')
    );

    if (mdxRule) {
      // Adjust the MDX options if needed
      mdxRule.use.forEach((loader) => {
        if (loader.loader && loader.loader.includes('mdx-loader')) {
          loader.options = {
            ...loader.options,
            providerImportSource: '@mdx-js/react',
          };
        }
      });
    }

    return config;
  }
};
export default config; 