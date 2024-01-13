// Define request parameter types for each endpoint

export interface RegisterUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  allow_extra_email: boolean;
}

export interface RegisterUserResponse {}

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  data: {
    token: string;
  };
}

export interface SendVerificationCodeRequest {
  email: string;
}

export interface SendVerificationCodeResponse {}

export interface VerifyAccountRequest {
  email: string;
  code: string;
}

export interface VerifyAccountResponse {}

export interface ChangePasswordRequest {
  email: string;
  oldPassword: string;
  newPassword: string;
  token: string;
}

export interface ChangePasswordResponse {}

export interface Document {
  institude: string;
  year: int;
  tags: string[];
}

export interface PostDocumentsRequest {
  token: string;
  documents: Document[];
}

export interface PostDocumentsResponse {}

export interface GetDocumentsRequest {
  token: string;
  query: string;
}

export interface DocumentNoUrl {
  id: string;
  institute: string;
  year: int;
  tags: string[];
}

export interface GetDocumentsResponse {
  documents: DocumentNoUrl[];
}

export interface GetDocumentRequest {
  token: string;
  id: string;
}

export interface GetDocumentResponse {
  id: string;
  resource_url: string;
  institude: string;
  year: int;
  tags: string[];
}
