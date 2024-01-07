import {
  checkHealth,
  postRegisterUser,
  postLoginUser,
  postSendVerificationCode,
  postVerifyAccount,
  postChangePassword,
  postDocuments,
  getDocuments,
  getDocument,
} from "./apiClient";
import axios from "axios";

jest.mock("axios");

describe("apiClient module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("checkHealth should be defined", () => {
    expect(checkHealth).toBeDefined();
  });

  it("check health should return data from axios", async () => {
    axios.get.mockResolvedValueOnce({ data: { healthy: "ok" } });
    const result = await checkHealth();
    expect(result).toEqual({ healthy: "ok" });
    expect(axios.get).toHaveBeenCalledWith("https://api.ishkul.org/health");
  });

  it("postRegisterUser should be defined", () => {
    expect(postRegisterUser).toBeDefined();
  });

  it("register should post data using axios and return response", async () => {
    const firstName = "Joe";
    const lastName = "Biden";
    const email = "joe.biden@email.com";
    const password = "mypass";
    const allowExtraEmail = true;
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
      allowExtraEmail
    );
    expect(result).toEqual({ message: "Registration successful" });
    expect(axios.post).toHaveBeenCalledWith("https://api.ishkul.org/register", {
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: password,
      allow_extra_email: allowExtraEmail,
    });
  });

  it("postLoginUser should be defined", () => {
    expect(postLoginUser).toBeDefined();
  });

  it("login should post data using axios and return response", async () => {
    const email = "joe.biden@email.com";
    const password = "mypass";

    const token = "mytok";

    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        token: token,
      },
    });
    const result = await postLoginUser(email, password);
    expect(result).toEqual({
      token: token,
    });
    expect(axios.post).toHaveBeenCalledWith("https://api.ishkul.org/login", {
      email: email,
      password: password,
    });
  });

  it("postSendVerificationCode should be defined", () => {
    expect(postSendVerificationCode).toBeDefined();
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

  it("postVerifyAccount should be defined", () => {
    expect(postVerifyAccount).toBeDefined();
  });

  it("postVerifyAccount should post data using axios and return response", async () => {
    const email = "joe.biden@email.com";
    const code = "12";
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postVerifyAccount(email, code);
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/verify_account",
      {
        email: email,
        code: code,
      }
    );
  });

  it("postChangePassword should be defined", () => {
    expect(postChangePassword).toBeDefined();
  });

  it("postChangePassword should post data using axios and return response", async () => {
    const email = "joe.biden@email.com";
    const oldPassword = "oldPassword";
    const newPassword = "newPassword";
    const token = "fakeToken";
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postChangePassword(
      email,
      oldPassword,
      newPassword,
      token
    );
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/change_password",
      {
        email: email,
        old_password: oldPassword,
        new_password: newPassword,
        token: token,
      }
    );
  });

  it("postDocuments should be defined", () => {
    expect(postDocuments).toBeDefined();
  });

  it("postDocuments should post data using axios and return response", async () => {
    const token = "test_token";
    const documents = [
      { institue: "Alice", year: 30, tags: ["a"] },
      { institue: "Alice", year: 30, tags: ["b"] },
    ];
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postDocuments(token, documents);
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/documents",
      {
        token: token,
        documents: documents,
      }
    );
  });

  it("getDocuments should be defined", () => {
    expect(getDocuments).toBeDefined();
  });

  it("getDocuments should post data using axios and return response", async () => {
    const token = "token";
    const filter = "filter";
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await getDocuments(token, filter);
    expect(result).toEqual({});
    expect(axios.get).toHaveBeenCalledWith(
      "https://api.ishkul.org/documents?token=token&query=filter"
    );
  });

  it("getDocument should be defined", () => {
    expect(getDocument).toBeDefined();
  });

  it("get document should post data using axios and return response", async () => {
    const token = "token";
    const id = "id";
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await getDocument(token, id);
    expect(result).toEqual({});
    expect(axios.get).toHaveBeenCalledWith(
      "https://api.ishkul.org/document?token=token&id=id"
    );
  });
});
