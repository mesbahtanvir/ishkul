import {
  getRoot,
  checkHealth,
  postExamPaper,
  getExamPapers,
  postRegisterUser,
  postLoginUser,
} from "./apiClient";
import axios from "axios";

jest.mock("axios");

describe("apiClient module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("check health should be defined", () => {
    expect(checkHealth).toBeDefined();
  });

  it("check health should return data from axios", async () => {
    axios.get.mockResolvedValueOnce({ data: { healthy: "ok" } });
    const result = await checkHealth();
    expect(result).toEqual({ healthy: "ok" });
    expect(axios.get).toHaveBeenCalledWith("https://api.ishkul.org/health");
  });

  it("register should post data using axios and return response", async () => {
    const firstName = "Joe";
    const lastName = "Biden";
    const email = "joe.biden@email.com";
    const password = "mypass";
    const marketingOptin = true;
    axios.post.mockResolvedValueOnce({
      status: "success",
      message: "Registration successful",
    });
    const result = await postRegisterUser(
      firstName,
      lastName,
      email,
      password,
      marketingOptin
    );
    expect(result).toEqual("Registration successful");
    expect(axios.post).toHaveBeenCalledWith("https://api.ishkul.org/register", {
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: password,
      marketing_optin: marketingOptin,
    });
  });

  it("login should post data using axios and return response", async () => {
    const firstName = "Joe";
    const lastName = "Biden";
    const email = "joe.biden@email.com";
    const password = "mypass";
    axios.post.mockResolvedValueOnce({
      first_name: firstName,
      last_name: lastName,
      email: email,
      token: password,
    });
    const result = await postLoginUser(email, password);
    expect(result).toEqual({
      first_name: firstName,
      last_name: lastName,
      email: email,
      token: password,
    });
    expect(axios.post).toHaveBeenCalledWith("https://api.ishkul.org/login", {
      email: email,
      password: password,
    });
  });
});
