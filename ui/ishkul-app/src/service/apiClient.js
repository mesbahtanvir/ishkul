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
  marketingOptin
) => {
  try {
    const response = await axios.post(`${BASE_URL}/register`, {
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: password,
      marketing_optin: marketingOptin,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      throw new Error("Failed to register user: User already exists");
    }
    if (error.response?.status === 400) {
      throw new Error("Failed to register user: Invalid email or password");
    }
    if (error.response?.status === 500) {
      throw new Error("Failed to register user: Internal server error");
    }
    throw new Error("Failed to register user: Unknown error occured");
  }
};

export const postLoginUser = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/login`, {
      email: email,
      password: password,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Failed to login user: User not found");
    }
    if (error.response?.status === 400) {
      throw new Error("Failed to login user: User & Email mismatch");
    }
    if (error.response?.statuss === 500) {
      throw new Error("Failed to login user: Internal server error");
    }
    throw new Error("Failed to login user: Unknown error occured");
  }
};

export const postSendVerificationCode = async (email) => {
  try {
    const response = await axios.post(`${BASE_URL}/send_verification_code`, {
      email: email,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Failed to recover: User not found");
    }
    if (error.response?.statuss === 500) {
      throw new Error("Failed to recover: Internal server error");
    }
    throw new Error("Failed to recover: Unknown error occured");
  }
};

export const postVerifyAccount = async (email, code) => {
  try {
    const response = await axios.post(`${BASE_URL}/verify_account`, {
      email: email,
      code: code,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Failed to verify: User or code not found");
    }
    if (error.response?.statuss === 500) {
      throw new Error("Failed to verify: Internal server error");
    }
    throw new Error("Failed to verify: Unknown error occured");
  }
};

export const postChangePassword = async (email, token, password) => {
  try {
    const response = await axios.post(
      "https://api.ishkul.org/change_password",
      {
        email: email,
        token: token,
        password: password,
      }
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Failed to change: User not found");
    }
    if (error.response?.status === 403) {
      throw new Error("Failed to change: Not permitted");
    }
    if (error.response?.statuss === 500) {
      throw new Error("Failed to change: Internal server error");
    }
    throw new Error("Failed to change: Unknown error occured");
  }
};

export const postDocuments = async (email, token, documents) => {
  try {
    const response = await axios.post(`${BASE_URL}/documents`, {
      email: email,
      token: token,
      documents: documents,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Failed to upload: Resource not found");
    }
    if (error.response?.status === 403) {
      throw new Error("Failed to upload: Not permitted");
    }
    if (error.response?.statuss === 500) {
      throw new Error("Failed to upload: Internal server error");
    }
    throw new Error("Failed to upload: Unknown error occured");
  }
};

export const getDocuments = async (email, token, filter) => {
  try {
    const encodedEmail = encodeURIComponent(email);
    const encodedToken = encodeURIComponent(token);
    const encodedQuery = encodeURIComponent(filter);
    const url = `${BASE_URL}/documents?email=${encodedEmail}&token=${encodedToken}&query=${encodedQuery}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Failed to load: Resource not found");
    }
    if (error.response?.status === 403) {
      throw new Error("Failed to load: Not permitted");
    }
    if (error.response?.statuss === 500) {
      throw new Error("Failed to load: Internal server error");
    }
    throw new Error("Failed to load: Unknown error occured");
  }
};

export const getDocument = async (email, token, id) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/document?email=${email}&token=${token}&id=${id}`
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Failed to upload: Resource not found");
    }
    if (error.response?.status === 403) {
      throw new Error("Failed to upload: Not permitted");
    }
    if (error.response?.statuss === 500) {
      throw new Error("Failed to upload: Internal server error");
    }
    throw new Error("Failed to upload: Unknown error occured");
  }
};
