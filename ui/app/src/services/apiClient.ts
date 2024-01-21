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
  const response = await axios
    .post<RegisterUserResponse>(`${BASE_URL}/register`, req)
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      if (error && error.response && error.response.data) {
        throw new Error(error.response.data.error);
      }
      throw error;
    });
  return response;
};

export const postLoginUser = async (
  req: LoginUserRequest
): Promise<LoginUserResponse> => {
  const response = await axios
    .post<LoginUserResponse>(`${BASE_URL}/login`, req)
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      if (error && error.response && error.response.data) {
        throw new Error(error.response.data.error);
      }
      throw error;
    });
  return response;
};

export const postSendVerificationCode = async (
  req: SendVerificationCodeRequest
): Promise<SendVerificationCodeResponse> => {
  const response = await axios
    .post<SendVerificationCodeResponse>(
      `${BASE_URL}/send_verification_code`,
      req
    )
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      if (error && error.response && error.response.data) {
        throw new Error(error.response.data.error);
      }
      throw error;
    });
  return response;
};

export const postVerifyAccount = async (
  req: VerifyAccountRequest
): Promise<VerifyAccountResponse> => {
  const response = await axios
    .post<VerifyAccountResponse>(`${BASE_URL}/verify_account`, req)
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      if (error && error.response && error.response.data) {
        throw new Error(error.response.data.error);
      }
      throw error;
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
      if (error && error.response && error.response.data) {
        throw new Error(error.response.data.error);
      }
      throw error;
    });
  return response;
};

export const postDocuments = async (
  req: PostDocumentsRequest
): Promise<PostDocumentsResponse> => {
  const response = await axios
    .post<PostDocumentsResponse>(`${BASE_URL}/documents`, req)
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      if (error && error.response && error.response.data) {
        throw new Error(error.response.data.error);
      }
      throw error;
    });
  return response;
};

export const getDocuments = async ({
  token,
  query,
}: GetDocumentsRequest): Promise<GetDocumentsResponse> => {
  const eToken = encodeURIComponent(token);
  const eQuery = encodeURIComponent(query);
  const url = `${BASE_URL}/documents?token=${eToken}&query=${eQuery}`;
  const response = await axios
    .get<GetDocumentsResponse>(url)
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      if (error && error.response && error.response.data) {
        throw new Error(error.response.data.error);
      }
      throw error;
    });
  return response;
};

export const getDocument = async ({
  token,
  id,
}: GetDocumentRequest): Promise<GetDocumentResponse> => {
  const eToken = encodeURIComponent(token);
  const eId = encodeURIComponent(id);
  const url = `${BASE_URL}/documentoken=${eToken}&id=${eId}`;
  const response = await axios
    .get<GetDocumentResponse>(url)
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
      if (error && error.response && error.response.data) {
        throw new Error(error.response.data.error);
      }
      throw error;
    });
  return response;
};
