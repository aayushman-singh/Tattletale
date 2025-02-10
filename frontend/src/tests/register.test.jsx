import React from "react"
import "@testing-library/jest-dom";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import configureStore from "redux-mock-store";
import Register from "../components/auth/register";
import { setUserInfo } from "../features/userSlice";

const mockStore = configureStore([]);
const mockAxios = new MockAdapter(axios);

describe("Register Component", () => {
  let store;

  beforeEach(() => {
    store = mockStore({});
    mockAxios.reset();
  });

  test("renders all form elements", () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue/i })).toBeInTheDocument();
  });

  test("login link points to /login", () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByRole("link", { name: /continue/i })).toHaveAttribute("href", "/login");
  });

  test("updates form state on user input", async () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "john@test.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByLabelText(/full name/i)).toHaveValue("John Doe");
    expect(screen.getByLabelText(/email/i)).toHaveValue("john@test.com");
    expect(screen.getByLabelText(/password/i)).toHaveValue("password123");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  test("handles successful registration", async () => {
    const mockUser = { id: 1, name: "John Doe", email: "john@test.com" };
    mockAxios.onPost("http://localhost:5001/api/users/signup").reply(200, mockUser);
  
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </Provider>
    );
  
    // Use await for fireEvent and waitFor
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "john@test.com" } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    });
  
    await waitFor(() => {
      const actions = store.getActions();
      expect(actions).toContainEqual(setUserInfo(mockUser));
    });
  });

  test("handles registration failure", async () => {
    mockAxios.onPost("http://localhost:5001/api/users/signup").reply(400, { 
      message: "Registration failed" 
    });
  
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </Provider>
    );
  
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "john@test.com" } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    });
  
    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });
});
