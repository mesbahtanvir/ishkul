import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders about react link", () => {
  render(<App />);
  const linkElement = screen.getByText(/about/i);
  expect(linkElement).toBeInTheDocument();
});
