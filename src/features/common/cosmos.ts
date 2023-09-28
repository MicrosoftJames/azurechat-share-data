import { Container, CosmosClient } from "@azure/cosmos";

// Read Cosmos DB_NAME and CONTAINER_NAME from .env
const DB_NAME = process.env.AZURE_COSMOSDB_DB_NAME || "chat";
const CONTAINER_NAME = process.env.AZURE_COSMOSDB_CONTAINER_NAME || "history";

export const initDBContainer = async () => {
  const endpoint = process.env.AZURE_COSMOSDB_URI;
  const key = process.env.AZURE_COSMOSDB_KEY;

  const client = new CosmosClient({ endpoint, key });

  const databaseResponse = await client.databases.createIfNotExists({
    id: DB_NAME,
  });

  const containerResponse =
    await databaseResponse.database.containers.createIfNotExists({
      id: CONTAINER_NAME,
      partitionKey: {
        paths: ["/userId"],
      },
    });

  return containerResponse.container;
};

export class CosmosDBContainer {
  private container: Promise<Container>;
  private containerName: string;
  private partitionKey: string;

  constructor(containerName: string, partitionKey: string) {
    const endpoint = process.env.AZURE_COSMOSDB_URI;
    const key = process.env.AZURE_COSMOSDB_KEY;
    this.containerName = containerName;
    this.partitionKey = partitionKey;

    const client = new CosmosClient({ endpoint, key });

    this.container = new Promise((resolve, reject) => {
      client.databases
        .createIfNotExists({
          id: DB_NAME,
        })
        .then((databaseResponse) => {
          databaseResponse.database.containers
            .createIfNotExists({
              id: this.containerName,
              partitionKey: {
                paths: [this.partitionKey],
              },
            })
            .then((containerResponse) => {
              resolve(containerResponse.container);
            });
        });
    });
  }

  public async getContainer(): Promise<Container> {
    return await this.container;
  }
}

export class CosmosDBHistoryContainer extends CosmosDBContainer {
  private static instance: CosmosDBHistoryContainer;
  private static containerName = "history";
  private static partitionKey = "/userId";

  public static getInstance(): CosmosDBHistoryContainer {
    if (!CosmosDBHistoryContainer.instance) {
      CosmosDBHistoryContainer.instance = new CosmosDBContainer(CosmosDBHistoryContainer.containerName, 
        CosmosDBHistoryContainer.partitionKey);
    }

    return CosmosDBHistoryContainer.instance;
  }

}

export class CosmosDBDataSourcesContainer extends CosmosDBContainer {
  private static instance: CosmosDBDataSourcesContainer;
  private static containerName = "dataSources";
  private static partitionKey = "/dataSourceId";

  public static getInstance(): CosmosDBDataSourcesContainer {
    if (!CosmosDBDataSourcesContainer.instance) {
      CosmosDBDataSourcesContainer.instance = new CosmosDBContainer(CosmosDBDataSourcesContainer.containerName, 
        CosmosDBDataSourcesContainer.partitionKey);
    }

    return CosmosDBDataSourcesContainer.instance;
  }
}
