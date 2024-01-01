import {
  checkHealth,
  postRegisterUser,
  postLoginUser,
  postSendVerificationCode,
  postVerifyAccount,
  postChangePassword,
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
      status: 201,
      data: {
        message: "Registration successful",
      },
    });
    const result = await postRegisterUser(
      firstName,
      lastName,
      email,
      password,
      marketingOptin
    );
    expect(result).toEqual({ message: "Registration successful" });
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
    const token = "mytok";
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        first_name: firstName,
        last_name: lastName,
        email: email,
        token: token,
      },
    });
    const result = await postLoginUser(email, password);
    expect(result).toEqual({
      first_name: firstName,
      last_name: lastName,
      email: email,
      token: token,
    });
    expect(axios.post).toHaveBeenCalledWith("https://api.ishkul.org/login", {
      email: email,
      password: password,
    });
  });

  it("postSendVerificationCode should post data using axios and return response", async () => {
    const email = "joe.biden@email.com";
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postSendVerificationCode(email);
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/send_verification_code",
      {
        email: email,
      }
    );
  });

  it("postVerifyAccount should post data using axios and return response", async () => {
    const email = "joe.biden@email.com";
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postVerifyAccount(email);
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/verify_account",
      {
        email: email,
      }
    );
  });

  it("account_recover should post data using axios and return response", async () => {
    const email = "joe.biden@email.com";
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postChangePassword(email);
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/change_password",
      {
        email: email,
      }
    );
  });
});
