import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Home from '../src/app/page';

// Mock next/dynamic so dynamic 3D components render synchronously without act warnings in JSDOM
jest.mock('next/dynamic', () => () => {
  const DynamicMock = () => <div data-testid="avatar-section-mock" />;
  DynamicMock.displayName = 'LoadableComponent';
  return DynamicMock;
});

describe('Home Page', () => {
  it('renders the AI Teaching Assistant header', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('AI Teaching Assistant');
  });

  it('renders the AssemblyAI pipeline badge', () => {
    render(<Home />);
    expect(screen.getByText(/AssemblyAI Live Pipeline/i)).toBeInTheDocument();
  });
});
