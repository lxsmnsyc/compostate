import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Hello from '../src';

describe('Example', () => {
  it('should have the expected content', () => {
    const greeting = 'World';
    render(<Hello greeting={greeting} />);

    expect(screen.getByText(`Hello ${greeting}`)).toBeInTheDocument();
  });
});
