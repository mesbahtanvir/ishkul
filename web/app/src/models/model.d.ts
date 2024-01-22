// Define request parameter types for each endpoint

export interface RegisterUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface RegisterUserResponse {}

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  data: {
    token: string;
    error: string;
  };
}

export interface SendVerificationCodeRequest {
  email: string;
}

export interface SendVerificationCodeResponse {}

export interface VerifyAccountRequest {
  email: string;
  code: string;
  token: string;
}

export interface VerifyAccountResponse {
  data: {
    token: string;
    error: string;
  };
}

export interface ChangePasswordRequest {
  email: string;
  new_password: string;
  token: string;
}

export interface ChangePasswordResponse {
  data: {
    token: string;
    error: string;
  };
}

export interface Document {
  resource_url: string;
  institute: string;
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
  data: {
    documents: DocumentNoUrl[];
  };
}

export interface GetDocumentRequest {
  token: string;
  id: string;
}

export interface GetDocumentResponse {
  data: {
    id: string;
    resource_url: string;
    institute: string;
    year: number;
    tags: string[];
  };
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_verified: bool;
  is_admin: bool;
  is_contributor;
}

export enum BottomNavbar {
  Upload = "Upload",
  Validate = "Validate",
  MyStats = "My Stats",
}
