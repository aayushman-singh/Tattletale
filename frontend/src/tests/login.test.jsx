import "@testing-library/jest-dom";
import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import configureStore from "redux-mock-store";
import Login from "../components/auth/login";

import { setUserInfo } from "../features/userSlice";

// Mock Redux Store
const mockStore = configureStore([]);
let store;

// Mock API
const mockAxios = new MockAdapter(axios);

describe("Login Component", () => {
    beforeEach(() => {
        // Reset localStorage mock before each test
        Storage.prototype.getItem = jest.fn(() => null);
        store = mockStore({});
        mockAxios.reset();
      });
    
      const renderWithProviders = () =>
        render(
          <Provider store={store}>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </Provider>
        );
  test("renders the login form correctly", () => {
    renderWithProviders();
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  test("updates email and password input fields", () => {
    renderWithProviders();
    
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
  });

  test("shows an error message when login fails", async () => {
    renderWithProviders();

    mockAxios.onPost("http://localhost:5001/api/users/login").reply(401);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "wrong@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "wrong123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Invalid credentials, please try again./i)
      ).toBeInTheDocument()
    );
  });

  test("calls API when valid credentials are submitted", async () => {
    renderWithProviders();

    const userData = { id: 1, email: "test@example.com", token: "12345" };
    mockAxios.onPost("http://localhost:5001/api/users/login").reply(200, userData);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(store.getActions()).toContainEqual(setUserInfo(userData));
    });
  });

  test("redirects user to /home if already logged in", () => {
    Storage.prototype.getItem = jest.fn(() => JSON.stringify({ email: "test@example.com" }));

    renderWithProviders();

    expect(screen.queryByText(/Welcome Back/i)).not.toBeInTheDocument();
  });

  test("disables the button while signing in", async () => {
    renderWithProviders();

    mockAxios.onPost("http://localhost:5001/api/users/login").reply(200, {});
    
    // Wait for form elements to be present
    const emailInput = await screen.findByLabelText(/Email/i);
    const passwordInput = await screen.findByLabelText(/Password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const button = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });
});
