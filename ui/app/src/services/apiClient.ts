import axios from "axios";
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
  try {
    const response = await axios
      .post<LoginUserResponse>(`${BASE_URL}/login`, req)
      .then((response) => response.data);

    if (isValidLoginUserResponse(response)) {
      return response;
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const isValidLoginUserResponse = (obj: any): obj is LoginUserResponse => {
  return "data" in obj; // Replace with actual validation logic
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
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const postVerifyAccount = async (
  req: VerifyAccountRequest
): Promise<VerifyAccountResponse> => {
  try {
    const response = await axios.post<VerifyAccountResponse>(
      `${BASE_URL}/verify_account`,
      req
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const postChangePassword = async (
  req: ChangePasswordRequest
): Promise<ChangePasswordResponse> => {
  try {
    const response = await axios.post<ChangePasswordResponse>(
      "https://api.ishkul.org/change_password",
      req
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
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
