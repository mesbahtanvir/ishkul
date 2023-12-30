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
    const response = await axios.post("https://api.ishkul.org/login", {
      email: email,
      password: password,
    });
    return response;
  } catch {
    throw new Error("Failed to register user");
  }
};
