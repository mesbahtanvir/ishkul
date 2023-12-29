import {
  getRoot,
  checkHealth,
  postExamPaper,
  getExamPapers,
  postRegisterUser,
  postLoginUser,
} from "./examPaperService";
import axios from "axios";

jest.mock("axios");

describe("examPaperService module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getRoot should be defined", () => {
    expect(getRoot).toBeDefined();
  });

  it("getRoot should return data from axios", async () => {
    axios.get.mockResolvedValueOnce({ data: "root data" });
    const result = await getRoot();
    expect(result).toEqual("root data");
    expect(axios.get).toHaveBeenCalledWith("/");
  });

  it("check health should be defined", () => {
    expect(checkHealth).toBeDefined();
  });

  it("check health should return data from axios", async () => {
    axios.get.mockResolvedValueOnce({ data: { healthy: "ok" } });
    const result = await checkHealth();
    expect(result).toEqual({ healthy: "ok" });
    expect(axios.get).toHaveBeenCalledWith("/health");
  });

  it("postExamPaper should be defined", () => {
    expect(postExamPaper).toBeDefined();
  });

  it("postExamPaper should post data using axios and return response", async () => {
    const mockResourceUrl = "http://example.com/resource";
    const mockMetadata = { key: "value" };
    axios.post.mockResolvedValueOnce({ data: "posted" });
    const result = await postExamPaper(mockResourceUrl, mockMetadata);
    expect(result).toEqual("posted");
    expect(axios.post).toHaveBeenCalledWith("/contrib/exam_paper", {
      resource_url: mockResourceUrl,
      metadata: mockMetadata,
    });
  });

  it("getExamPapers should be defined", () => {
    expect(getExamPapers).toBeDefined();
  });

  it("getExamPapers should return data from axios", async () => {
    axios.get.mockResolvedValueOnce({ data: ["paper1", "paper2"] });
    const result = await getExamPapers();
    expect(result).toEqual(["paper1", "paper2"]);
    expect(axios.get).toHaveBeenCalledWith("/contrib/exam_paper");
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
    expect(axios.post).toHaveBeenCalledWith("/register", {
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
    expect(axios.post).toHaveBeenCalledWith("/login", {
      email: email,
      password: password,
    });
  });
});
