import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { AzureCogSearch } from "../../langchain/vector-stores/azure-cog-search/azure-cog-vector-store";
import { FaqDocumentIndex } from "../chat-services/models";


export const initVectorStore = () => {
    const embedding = new OpenAIEmbeddings();
    const azureSearch = new AzureCogSearch<FaqDocumentIndex>(embedding, {
      name: process.env.AZURE_SEARCH_NAME,
      indexName: process.env.AZURE_SEARCH_INDEX_NAME,
      apiKey: process.env.AZURE_SEARCH_API_KEY,
      apiVersion: process.env.AZURE_SEARCH_API_VERSION,
      vectorFieldName: "embedding",
    });
  
    return azureSearch;
  };

  export const findRelevantDocuments = async (query: string, filter: string) => {
    const vectorStore = initVectorStore();
    const relevantDocuments = await vectorStore.similaritySearch(query, 5, {
      vectorFields: vectorStore.config.vectorFieldName,
      filter: filter,
    });
  
    return relevantDocuments;
  };