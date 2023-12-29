import axios from "axios";

export const checkHealth = async () => {
  try {
    const response = await axios.get("/health");
    return response.data;
  } catch (error) {
    throw new Error("Failed to check health");
  }
};

export const getRoot = async () => {
  try {
    const response = await axios.get("/");
    return response.data;
  } catch (error) {
    throw new Error("Failed to get root");
  }
};

export const postExamPaper = async (resourceUrl, metadata) => {
  try {
    const response = await axios.post("/contrib/exam_paper", {
      resource_url: resourceUrl,
      metadata,
    });
    return response.data;
  } catch (error) {
    throw new Error("Failed to post exam paper");
  }
};

export const getExamPapers = async () => {
  try {
    const response = await axios.get("/contrib/exam_paper");
    return response.data;
  } catch (error) {
    throw new Error("Failed to get exam papers");
  }
};
