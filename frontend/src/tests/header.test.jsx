import React from "react";
import userEvent from '@testing-library/user-event';
import { render, screen, fireEvent, waitFor,within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../components/header"; 
import "@testing-library/jest-dom";

// Mock `useNavigate` and `useLocation`
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(() => jest.fn()),
  useLocation: jest.fn(() => ({ pathname: "/" })),
}));

describe("Header Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Test 1: Renders login/register buttons when user is not logged in
  test("renders login and register buttons when user is not logged in", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
  });

  // Test 2: Displays username and logout button when user is logged in
  test("displays username and logout button when user is logged in", () => {
    localStorage.setItem("userInfo", JSON.stringify({ name: "Test User" }));

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  // Test 3: Logs out and redirects to home on logout button click
  test("logs out and redirects to home on logout button click", () => {
    localStorage.setItem("userInfo", JSON.stringify({ name: "Test User" }));

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Logout"));
    expect(localStorage.getItem("userInfo")).toBeNull();
  });

 
  // Test 4: Dropdown menu opens and closes correctly
 
  test('dropdown opens', async () => {
    // Set up user session
    localStorage.setItem("userInfo", JSON.stringify({ name: "Test User" }));
    const user = userEvent.setup();
  
    // Render component
    const { container } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
  
    // Open dropdown
    await user.click(screen.getByTestId('services-dropdown'));
  
   
    await waitFor(() => {
      expect(screen.getByText('Social Media Investigation')).toBeInTheDocument();
      expect(screen.getByText('OSINT Tools')).toBeInTheDocument();
    }, { timeout: 3000 }); // Extend timeout for animations
  
    
  });

  // Test 5: Renders correct UI elements

  test("renders header elements correctly", () => {
    localStorage.setItem("userInfo", JSON.stringify({ name: "Test User" }));
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("tattletale")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
  });
});
