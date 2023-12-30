import axios from "axios";

export const checkHealth = async () => {
  try {
    const response = await axios.get("https://api.ishkul.org/health");
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
    const response = await axios.post("https://api.ishkul.org/register", {
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
    const response = await axios.post("https://api.ishkul.org/login", {
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
