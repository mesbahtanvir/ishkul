import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DocumentNoUrl, GetDocumentResponse } from "../../models/model";

interface Resources {
  data: {
    documents: DocumentNoUrl[];
    documentsInView: DocumentNoUrl[];
    currentPage: number;
    pageCount: number;
  };
  current: {
    document: GetDocumentResponse;
  };
}

const initialState: Resources = {
  data: { documents: [], documentsInView: [], currentPage: 1, pageCount: 1 },
  current: {
    document: { id: "", resource_url: "", institute: "", year: 0, tags: [] },
  },
};

interface StoreDocumentsPayload {
  documents: DocumentNoUrl[];
}

interface StoreDocumentPayload {
  document: GetDocumentResponse;
}

interface SetCurrentPagePayload {
  currentPage: number;
}

// Helper function to update page count and documents in view
function updatePagination(state: Resources) {
  const len = state.data.documents.length;
  state.data.pageCount = Math.ceil(len / 10);

  const startIndex = (state.data.currentPage - 1) * 10;
  state.data.documentsInView = state.data.documents.slice(
    startIndex,
    startIndex + 10
  );
}

export const resourcesSlice = createSlice({
  name: "resources",
  initialState,
  reducers: {
    storeDocuments: (state, action: PayloadAction<StoreDocumentsPayload>) => {
      state.data.documents = action.payload.documents;
      state.data.currentPage = 1;
      updatePagination(state);
    },
    storeDocument: (state, action: PayloadAction<StoreDocumentPayload>) => {
      state.current.document = action.payload.document;
    },

    setCurrentPage: (state, action: PayloadAction<SetCurrentPagePayload>) => {
      state.data.currentPage = action.payload.currentPage;
      updatePagination(state);
    },

    clearDocument: (state) => {
      state.data.documents = [];
      state.data.documentsInView = [];
      state.data.currentPage = 1;
      state.data.pageCount = 1;
    },
  },
});

export const { storeDocuments, storeDocument, setCurrentPage, clearDocument } =
  resourcesSlice.actions;
export default resourcesSlice.reducer;
