import React from 'react';
import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../components/home/index';

// Mock GSAP and related modules
jest.mock("gsap", () => ({
    gsap: {
      registerPlugin: jest.fn(),
      from: jest.fn(),
      to: jest.fn(),
      utils: {
        toArray: jest.fn(() => []) // Mocking toArray to return an empty array
      }
    }
  }));
  
  jest.mock("gsap/ScrollTrigger", () => ({
    ScrollTrigger: {
      refresh: jest.fn(),
      defaults: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  }));

jest.mock('react-scroll', () => ({
  scroller: {
    scrollTo: jest.fn(),
  },
}));

describe('Home Component Basic Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // 1. Basic Rendering Tests
  test('renders main sections without crashing', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
  
    expect(screen.getAllByText(/advanced analytics/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/cutting-edge features/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/why choose our platform/i)).not.toHaveLength(0);
  });
  
  

  // 2. Navigation Tests
  test('has working navigation links', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    const links1 = screen.getAllByRole('link', { name: /start investigation/i });
    expect(links1[0]).toHaveAttribute('href', '/services');
    const links2 = screen.getAllByRole('link', { name: /explore other services/i });
expect(links2[0]).toHaveAttribute('href', '/servicesMain');

  });

  // 3. Content Verification Tests
  test('displays all feature cards', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    const featureTitles = [
      'Advanced Security',
      'Global Coverage',
      'Real-time Analytics',
      'Access Control',
      'Smart Search',
      'Custom Reports'
    ];

    featureTitles.forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  // 4. Image Rendering Tests
  test('displays hero images', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByAltText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByAltText('Platform Features')).toBeInTheDocument();
  });

  // 5. Scroll Behavior Test
  test('handles scroll location state', () => {
    const mockScrollTo = jest.fn();
    require('react-scroll').scroller.scrollTo = mockScrollTo;

    render(
      <MemoryRouter initialEntries={[{ state: { scrollTo: 'features' } }]}>
        <Home />
      </MemoryRouter>
    );

    expect(mockScrollTo).toHaveBeenCalledWith('features', {
      smooth: true,
      duration: 500,
    });
  });

  // 6. Security Content Test
  test('displays security-related content', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText(/enterprise-grade security/i)).toBeInTheDocument();
    expect(screen.getByText(/bank-grade security/i)).toBeInTheDocument();
  });

  // 7. Responsiveness Test
  test('hero image container has correct responsive classes', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    const imageContainer = screen.getByAltText('Analytics Dashboard').parentElement;
    expect(imageContainer).toHaveClass('hidden lg:block');
  });
});