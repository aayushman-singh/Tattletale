import React,{act} from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchPage from "../components/servicesOsint"; // Adjust the import path
import fetchMock from "jest-fetch-mock";
import "@testing-library/jest-dom";


fetchMock.enableMocks();

describe("SearchPage Component", () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  test("renders the search input and button", () => {
    render(<SearchPage />);
    
    expect(screen.getByPlaceholderText("Enter a username")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unveil Digital Presence" })).toBeInTheDocument();
  });

  test("updates the input field when typing", async () => {
    render(<SearchPage />);
    const input = screen.getByPlaceholderText("Enter a username");

    await userEvent.type(input, "testuser");
    expect(input).toHaveValue("testuser");
  });

  test("displays a loading state when submitting a search", async () => {
  fetch.mockResponseOnce(JSON.stringify({ urls: [] }));

  render(<SearchPage />);
  const input = screen.getByPlaceholderText("Enter a username");
  const button = screen.getByRole("button", { name: "Unveil Digital Presence" });

  await userEvent.type(input, "testuser");

 
    userEvent.click(button);
    // await new Promise((r) => setTimeout(r, 100)); // Wait for state update


  await waitFor(() => {
    expect(button).toHaveTextContent("Searching...");
  });
});

  

  test("fetches and displays URLs on successful response", async () => {
    fetch.mockResponseOnce(
      JSON.stringify({ urls: ["https://example.com/profile/testuser"] })
    );

    render(<SearchPage />);
    const input = screen.getByPlaceholderText("Enter a username");
    const button = screen.getByRole("button", { name: "Unveil Digital Presence" });

    await userEvent.type(input, "testuser");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Results for testuser")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/profile/testuser")).toBeInTheDocument();
    });
  });

 

  test("displays no URLs found message if response is empty", async () => {
    fetch.mockResponseOnce(JSON.stringify({ urls: [] }));

    render(<SearchPage />);
    const input = screen.getByPlaceholderText("Enter a username");
    const button = screen.getByRole("button", { name: "Unveil Digital Presence" });

    await userEvent.type(input, "testuser");
    fireEvent.submit(button);

    await waitFor(() => {
      expect(screen.getByText("No URLs found for the given username.")).toBeInTheDocument();
    });
  });

  test("disables button when searching", async () => {
    fetch.mockResponseOnce(JSON.stringify({ urls: [] }));

    render(<SearchPage />);
    const input = screen.getByPlaceholderText("Enter a username");
    const button = screen.getByRole("button", { name: "Unveil Digital Presence" });

    await userEvent.type(input, "testuser");
    fireEvent.submit(button);

    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
