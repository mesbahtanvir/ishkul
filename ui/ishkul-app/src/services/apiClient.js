import axios from "axios";

const BASE_URL =
  process.env.REACT_APP_BACKEND_BASE_URL ?? "https://api.ishkul.org";

export const checkHealth = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to check health");
  }
};

export const postRegisterUser = async (
  firstName,
  lastName,
  email,
  password,
  allowExtraEmail
) => {
  const response = await axios.post(`${BASE_URL}/register`, {
    first_name: firstName,
    last_name: lastName,
    email: email,
    password: password,
    allow_extra_email: allowExtraEmail,
  });
  return response.data;
};

export const postLoginUser = async (email, password) => {
  const response = await axios.post(`${BASE_URL}/login`, {
    email: email,
    password: password,
  });
  return response.data;
};

export const postSendVerificationCode = async (email) => {
  const response = await axios.post(`${BASE_URL}/send_verification_code`, {
    email: email,
  });
  return response.data;
};

export const postVerifyAccount = async (email, code) => {
  const response = await axios.post(`${BASE_URL}/verify_account`, {
    email: email,
    code: code,
  });
  return response.data;
};

export const postChangePassword = async (
  email,
  oldPassword,
  newPassword,
  token
) => {
  const response = await axios.post("https://api.ishkul.org/change_password", {
    email: email,
    old_password: oldPassword,
    new_password: newPassword,
    token: token,
  });
  return response.data;
};

export const postDocuments = async (token, documents) => {
  const response = await axios.post(`${BASE_URL}/documents`, {
    token: token,
    documents: documents,
  });
  return response.data;
};

export const getDocuments = async (token, filter) => {
  const encodedToken = encodeURIComponent(token);
  const encodedQuery = encodeURIComponent(filter);
  const url = `${BASE_URL}/documents?token=${encodedToken}&query=${encodedQuery}`;
  const response = await axios.get(url);
  return response.data;
};

export const getDocument = async (token, id) => {
  const encodedToken = encodeURIComponent(token);
  const encodedId = encodeURIComponent(id);
  const response = await axios.get(
    `${BASE_URL}/document?token=${encodedToken}&id=${encodedId}`
  );
  return response.data;
};
