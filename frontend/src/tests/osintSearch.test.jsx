import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchPage from "../components/servicesOsint";
import fetchMock from "jest-fetch-mock";
import "@testing-library/jest-dom";

fetchMock.enableMocks();

describe("SearchPage - search trigger and error/empty states", () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  // Search trigger: typing + clicking fires a POST to the search endpoint with the username
  test("submitting the search calls the search API with the typed username", async () => {
    fetch.mockResponseOnce(JSON.stringify({ urls: ["https://x.com/jdoe"] }));

    render(<SearchPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter a username"), "jdoe");
    fireEvent.click(screen.getByRole("button", { name: "Unveil Digital Presence" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:5000/api/search");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ username: "jdoe" });
  });

  // Results rendering after a successful response with multiple urls
  test("renders all returned urls in a results list", async () => {
    fetch.mockResponseOnce(
      JSON.stringify({ urls: ["https://a.com/jdoe", "https://b.com/jdoe"] })
    );

    render(<SearchPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter a username"), "jdoe");
    fireEvent.click(screen.getByRole("button", { name: "Unveil Digital Presence" }));

    await waitFor(() => {
      expect(screen.getByText("https://a.com/jdoe")).toBeInTheDocument();
      expect(screen.getByText("https://b.com/jdoe")).toBeInTheDocument();
    });
  });

  // Error state: a failed (non-ok) fetch surfaces an error message to the user
  test("shows an error message when the fetch responds with a non-ok status", async () => {
    fetch.mockResponseOnce("Server error", { status: 500 });

    render(<SearchPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter a username"), "jdoe");
    fireEvent.click(screen.getByRole("button", { name: "Unveil Digital Presence" }));

    await waitFor(() =>
      expect(screen.getByText(/Failed to fetch results/i)).toBeInTheDocument()
    );
  });

  // Error state: a rejected fetch (network failure) surfaces an error message
  test("shows an error message when the fetch rejects (network failure)", async () => {
    fetch.mockRejectOnce(new Error("Network down"));

    render(<SearchPage />);
    await userEvent.type(screen.getByPlaceholderText("Enter a username"), "jdoe");
    fireEvent.click(screen.getByRole("button", { name: "Unveil Digital Presence" }));

    await waitFor(() =>
      expect(screen.getByText(/Network down/i)).toBeInTheDocument()
    );
  });

  // Empty query gate: the username input is required, blocking empty submits
  test("the username input is required so empty queries are blocked", () => {
    render(<SearchPage />);
    expect(screen.getByPlaceholderText("Enter a username")).toBeRequired();
  });
});
