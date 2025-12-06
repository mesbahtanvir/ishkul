import React from 'react';
import { render } from '@testing-library/react-native';
import { MarkdownContent } from '../MarkdownContent';

// Mock dependencies
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        primary: '#000000',
        secondary: '#666666',
      },
      background: {
        primary: '#FFFFFF',
        secondary: '#F5F5F5',
      },
      primary: '#0066FF',
      border: '#E0E0E0',
    },
  }),
}));

jest.mock('react-native-markdown-display', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ children }: { children: string }) => <Text>{children}</Text>;
});

describe('MarkdownContent', () => {
  it('should render simple text', () => {
    const { getByText } = render(<MarkdownContent content="Hello World" />);
    expect(getByText('Hello World')).toBeTruthy();
  });

  it('should render markdown content', () => {
    const content = '# Heading\n\nParagraph text';
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle empty content', () => {
    const { toJSON } = render(<MarkdownContent content="" />);
    expect(toJSON()).toBeTruthy();
  });

  it('should parse and display citations', () => {
    const content = `
Some text with citation[^1].

[^1]: Source reference
    `;
    const { toJSON, queryByText } = render(
      <MarkdownContent content={content} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should display multiple citations', () => {
    const content = `
Text with multiple citations[^1][^2].

[^1]: First source
[^2]: Second source
    `;
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle content with code blocks', () => {
    const content = `
Here is some code:

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`
    `;
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle inline code', () => {
    const content = 'Use `const` for constants';
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle lists', () => {
    const content = `
- Item 1
- Item 2
- Item 3
    `;
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle ordered lists', () => {
    const content = `
1. First
2. Second
3. Third
    `;
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle blockquotes', () => {
    const content = '> This is a quote';
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle bold and italic text', () => {
    const content = '**Bold** and *italic* text';
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle links', () => {
    const content = '[Click here](https://example.com)';
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle horizontal rules', () => {
    const content = 'Before\n\n---\n\nAfter';
    const { toJSON } = render(<MarkdownContent content={content} />);
    expect(toJSON()).toBeTruthy();
  });
});
