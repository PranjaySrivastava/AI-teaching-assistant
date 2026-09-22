import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('navigates to Code Lab and displays the Code Explainer', () => {
    render(<Home />);
    // Launch Code Lab from hero banner
    const launchBtn = screen.getByText(/Launch Interactive Code Lab/i);
    fireEvent.click(launchBtn);

    // Verify Code Explainer tab exists
    const explainerTab = screen.getByRole('button', { name: /Code Explainer/i });
    expect(explainerTab).toBeInTheDocument();

    // Click Code Explainer tab
    fireEvent.click(explainerTab);

    // Check for Code Explainer content
    expect(screen.getByText(/Architectural Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Lecture Walkthrough/i)).toBeInTheDocument();
    expect(screen.getByText(/O\(1\) Space Bound/i)).toBeInTheDocument();
  });
});
