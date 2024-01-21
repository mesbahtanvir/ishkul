import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Document } from "../../models/model";

interface ContributeResources {
  data: {
    documents: Document[];
  };
}

const initialState: ContributeResources = {
  data: { documents: [] },
};

interface StoreDocumentsPayload {
  documents: Document[];
}

export const contributeResourcesSlice = createSlice({
  name: "contribute_resources",
  initialState,
  reducers: {
    storeContributeDocuments: (
      state,
      action: PayloadAction<StoreDocumentsPayload>
    ) => {
      state.data.documents = [
        ...state.data.documents,
        ...action.payload.documents,
      ];
    },

    clearContributeDocument: (state) => {
      state.data.documents = [];
    },
  },
});

export const { storeContributeDocuments, clearContributeDocument } =
  contributeResourcesSlice.actions;
export default contributeResourcesSlice.reducer;
