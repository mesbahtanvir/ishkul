import axios from "axios";

export const checkHealth = async () => {
  try {
    const response = await axios.get("/health");
    return response.data;
  } catch (error) {
    throw new Error("Failed to check health");
  }
};

export const getRoot = async () => {
  try {
    const response = await axios.get("/");
    return response.data;
  } catch (error) {
    throw new Error("Failed to get root");
  }
};

export const postExamPaper = async (resourceUrl, metadata) => {
  try {
    const response = await axios.post("/contrib/exam_paper", {
      resource_url: resourceUrl,
      metadata,
    });
    return response.data;
  } catch (error) {
    throw new Error("Failed to post exam paper");
  }
};

export const getExamPapers = async () => {
  try {
    const response = await axios.get("/contrib/exam_paper");
    return response.data;
  } catch (error) {
    throw new Error("Failed to get exam papers");
  }
};

export const postRegisterUser = async (
  firstName,
  lastName,
  email,
  password,
  marketingOptin
) => {
  try {
    const response = await axios.post("/register", {
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: password,
      marketing_optin: marketingOptin,
    });
    if (response.status !== "success") {
      throw new Error("Failed to register user");
    }
    return response.message;
  } catch {
    throw new Error("Failed to register user");
  }
};

export const postLoginUser = async (email, password) => {
  try {
    const response = await axios.post("/login", {
      email: email,
      password: password,
    });
    return response;
  } catch {
    throw new Error("Failed to register user");
  }
};
