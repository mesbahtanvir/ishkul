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

    if (response.status === 409) {
      throw new Error("User already exists");
    }
    if (response.status === 500) {
      throw new Error("Internal server error");
    }
    if (response.status !== 201 && response.status !== 200) {
      throw new Error("Unknown error occured");
    }
    return response.data;
  } catch (error) {
    throw new Error("Failed to register user: " + error.message);
  }
};

export const postLoginUser = async (email, password) => {
  try {
    const response = await axios.post("https://api.ishkul.org/login", {
      email: email,
      password: password,
    });
    // Check if the response status is 201
    if (response.status === 404) {
      throw new Error("User not found");
    }
    if (response.status === 400) {
      throw new Error("User & Email mismatch");
    }
    if (response.status === 500) {
      throw new Error("Internal server error");
    }
    if (response.status !== 200) {
      throw new Error("Unknown error occured");
    }
    return response.data;
  } catch (error) {
    throw new Error("Failed to login user: " + error.message);
  }
};
