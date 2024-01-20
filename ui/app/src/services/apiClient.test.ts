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

import {
  RegisterUserRequest,
  LoginUserRequest,
  SendVerificationCodeRequest,
  VerifyAccountRequest,
  ChangePasswordRequest,
  PostDocumentsRequest,
  GetDocumentsRequest,
  GetDocumentRequest,
} from "../models/model";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("apiClient module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("checkHealth should be defined", () => {
    expect(checkHealth).toBeDefined();
  });

  it("check health should return data from axios", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 201,
      data: { healthy: "ok" },
    });
    const result = await checkHealth();
    expect(result).toEqual({ healthy: "ok" });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://api.ishkul.org/health"
    );
  });

  it("postRegisterUser should be defined", () => {
    expect(postRegisterUser).toBeDefined();
  });

  it("register should post data using axios and return response", async () => {
    const userData: RegisterUserRequest = {
      first_name: "Joe",
      last_name: "Biden",
      email: "joe.biden@email.com",
      password: "mypass",
    };
    mockedAxios.post.mockResolvedValueOnce({
      status: 201,
      data: {
        message: "ok",
      },
    });
    const result = await postRegisterUser(userData);
    expect(result).toEqual({ message: "ok" });
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/register",
      userData
    );
  });

  it("postLoginUser should be defined", () => {
    expect(postLoginUser).toBeDefined();
  });

  it("login should post data using axios and return response", async () => {
    const userData: LoginUserRequest = {
      email: "joe.biden@email.com",
      password: "mypass",
    };
    const token = "mytok";
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          token: token,
        },
      },
    });
    const result = await postLoginUser(userData);
    expect(result).toEqual({
      data: {
        token: token,
      },
    });
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/login",
      userData
    );
  });

  it("postSendVerificationCode should be defined", () => {
    expect(postSendVerificationCode).toBeDefined();
  });

  it("postSendVerificationCode should post data using axios and return response", async () => {
    const userData: SendVerificationCodeRequest = {
      email: "joe.biden@email.com",
    };
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postSendVerificationCode(userData);
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/send_verification_code",
      userData
    );
  });

  it("postVerifyAccount should be defined", () => {
    expect(postVerifyAccount).toBeDefined();
  });

  it("postVerifyAccount should post data using axios and return response", async () => {
    const userData: VerifyAccountRequest = {
      email: "joe.biden@email.com",
      code: "12",
    };

    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postVerifyAccount(userData);
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/verify_account",
      userData
    );
  });

  it("postChangePassword should be defined", () => {
    expect(postChangePassword).toBeDefined();
  });

  it("postChangePassword should post data using axios and return response", async () => {
    const userData: ChangePasswordRequest = {
      email: "joe.biden@email.com",
      oldPassword: "oldPassword",
      newPassword: "newPassword",
      token: "fakeToken",
    };

    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postChangePassword(userData);
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/change_password",
      userData
    );
  });

  it("postDocuments should be defined", () => {
    expect(postDocuments).toBeDefined();
  });

  it("postDocuments should post data using axios and return response", async () => {
    const userData: PostDocumentsRequest = {
      token: "myTok",
      documents: [
        {
          institude: "Dhaka",
          year: 1,
          tags: ["a", "b"],
        },
      ],
    };
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await postDocuments(userData);
    expect(result).toEqual({});
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.ishkul.org/documents",
      userData
    );
  });

  it("getDocuments should be defined", () => {
    expect(getDocuments).toBeDefined();
  });

  it("getDocuments should post data using axios and return response", async () => {
    const userData: GetDocumentsRequest = {
      token: "token",
      query: "filter",
    };
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await getDocuments(userData);
    expect(result).toEqual({});
    expect(axios.get).toHaveBeenCalledWith(
      "https://api.ishkul.org/documents?token=token&query=filter"
    );
  });

  it("getDocument should be defined", () => {
    expect(getDocument).toBeDefined();
  });

  it("get document should post data using axios and return response", async () => {
    const userData: GetDocumentRequest = {
      token: "token",
      id: "id",
    };
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {},
    });
    const result = await getDocument(userData);
    expect(result).toEqual({});
    expect(axios.get).toHaveBeenCalledWith(
      "https://api.ishkul.org/document?token=token&id=id"
    );
  });
});
