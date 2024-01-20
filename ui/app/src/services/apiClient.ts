import {
  RegisterUserRequest,
  RegisterUserResponse,
  LoginUserRequest,
  LoginUserResponse,
  SendVerificationCodeRequest,
  SendVerificationCodeResponse,
  VerifyAccountRequest,
  VerifyAccountResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  PostDocumentsRequest,
  PostDocumentsResponse,
  GetDocumentsRequest,
  GetDocumentsResponse,
  GetDocumentRequest,
  GetDocumentResponse,
} from "../models/model";

import axios from "axios";

const BASE_URL =
  process.env.REACT_APP_BACKEND_BASE_URL ?? "https://api.ishkul.org";

export const checkHealth = async (): Promise<RegisterUserResponse> => {
  try {
    const response = await axios.get<RegisterUserResponse>(
      `${BASE_URL}/health`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to check health");
  }
};

export const postRegisterUser = async (
  req: RegisterUserRequest
): Promise<any> => {
  try {
    const response = await axios.post(`${BASE_URL}/register`, req);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const postLoginUser = async (
  req: LoginUserRequest
): Promise<LoginUserResponse> => {
  console.log("hello");
  const response = await axios
    .post<LoginUserResponse>(`${BASE_URL}/login`, req)
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      throw new Error(error.response.data.error);
    });
  return response;
};

export const postSendVerificationCode = async (
  req: SendVerificationCodeRequest
): Promise<SendVerificationCodeResponse> => {
  try {
    const response = await axios.post<SendVerificationCodeResponse>(
      `${BASE_URL}/send_verification_code`,
      req
    );
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(error.response.data.error);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error("No response was received from the server");
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(error.message);
      }
    } else {
      // Not an Axios error
      throw error;
    }
  }
};

export const postVerifyAccount = async (
  req: VerifyAccountRequest
): Promise<VerifyAccountResponse> => {
  const response = await axios
    .post<VerifyAccountResponse>(`${BASE_URL}/verify_account`, req)
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      throw new Error(error.response.data.error);
    });
  return response;
};

export const postChangePassword = async (
  req: ChangePasswordRequest
): Promise<ChangePasswordResponse> => {
  const response = await axios
    .post<ChangePasswordResponse>(`${BASE_URL}/change_password`, req)
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      if (error && error.response) {
        throw new Error(error.response.data.error);
      }
      throw error;
    });
  return response;
};

export const postDocuments = async (
  req: PostDocumentsRequest
): Promise<PostDocumentsResponse> => {
  try {
    const response = await axios.post<PostDocumentsResponse>(
      `${BASE_URL}/documents`,
      req
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getDocuments = async ({
  token,
  query,
}: GetDocumentsRequest): Promise<GetDocumentsResponse> => {
  try {
    const url = `${BASE_URL}/documents?token=${encodeURIComponent(
      token
    )}&query=${encodeURIComponent(query)}`;
    const response = await axios.get<GetDocumentsResponse>(url);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getDocument = async ({
  token,
  id,
}: GetDocumentRequest): Promise<GetDocumentResponse> => {
  try {
    const response = await axios.get<GetDocumentResponse>(
      `${BASE_URL}/document?token=${encodeURIComponent(
        token
      )}&id=${encodeURIComponent(id)}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
