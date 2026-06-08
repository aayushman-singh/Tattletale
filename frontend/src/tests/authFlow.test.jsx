import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import configureStore from "redux-mock-store";
import Login from "../components/auth/login";
import Register from "../components/auth/register";

const mockStore = configureStore([]);
const mockAxios = new MockAdapter(axios);

const renderWithProviders = (store, ui) =>
  render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );

describe("Auth flow - extra coverage", () => {
  let store;

  beforeEach(() => {
    store = mockStore({});
    mockAxios.reset();
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
  });

  // Register validation: terms must be accepted before submit
  test("register blocks submit and shows error when terms are not accepted", async () => {
    renderWithProviders(store, <Register />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@test.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret123" } });
    // terms checkbox intentionally left unchecked
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/you must accept the terms and conditions/i)
      ).toBeInTheDocument()
    );
    // No signup request should have been issued
    expect(mockAxios.history.post).toHaveLength(0);
  });

  // Register falls back to generic message when server omits a message
  test("register shows generic error message when server returns no message", async () => {
    mockAxios.onPost("http://localhost:5001/api/users/signup").reply(500);

    renderWithProviders(store, <Register />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@test.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() =>
      expect(screen.getByText(/registration failed\. please try again\./i)).toBeInTheDocument()
    );
  });

  // Login required fields - inputs are marked required (HTML validation gate)
  test("login email and password inputs are required", () => {
    renderWithProviders(store, <Login />);

    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/password/i)).toBeRequired();
  });

  // Login link to register exists and points to /register
  test("login offers a link to the register page", () => {
    renderWithProviders(store, <Login />);

    const link = screen.getByRole("link", { name: /sign up/i });
    expect(link).toHaveAttribute("href", "/register");
  });
});
