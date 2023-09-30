import * as AWS from "aws-sdk";
const AWSXRay = require("aws-xray-sdk");
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { createLogger } from "../utils/logger";
import { TodoItem } from "../models/TodoItem";
import { TodoUpdate } from "../models/TodoUpdate";


const XAWS = AWSXRay.captureAWS(AWS);
const logger = createLogger("TodoAccess");
const url_expiration = process.env.SIGNED_URL_EXPIRATION;
const s3_bucket_name = process.env.ATTACHMENT_S3_BUCKET;

export class TodosAccess {
  constructor(
    private readonly docClient: DocumentClient = createDynamoDBClient(),
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly todosIndex = process.env.TODOS_CREATED_AT_INDEX,
    private readonly S3 = new XAWS.S3({ signatureVersion: "v4" }),
    private readonly bucket_name = s3_bucket_name
  ) {}


  async getAllClient(userId: string): Promise<TodoItem[]> {
    const resuslt = await this.docClient
      .query({
        TableName: this.todosTable,
        IndexName: this.todosIndex,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
      .promise();
    return resuslt.Items as TodoItem[];
  }



  async createClient(item: TodoItem): Promise<TodoItem> {
    await this.docClient
      .put({
        TableName: this.todosTable,
        Item: item,
      })
      .promise();
    return item as TodoItem;
  }



  async updateClient(
    userId: string,
    todoId: string,
    todoUpdate: TodoUpdate
  ): Promise<TodoItem> {
    logger.info(`Updating todo item ${todoId} in ${this.todosTable}`);
    try {
      await this.docClient
        .update({
          TableName: this.todosTable,
          Key: {
            userId,
            todoId,
          },
          UpdateExpression:
            "set #name = :name, #dueDate = :dueDate, #done = :done",
          ExpressionAttributeNames: {
            "#name": "name",
            "#dueDate": "dueDate",
            "#done": "done",
          },
          ExpressionAttributeValues: {
            ":name": todoUpdate.name,
            ":dueDate": todoUpdate.dueDate,
            ":done": todoUpdate.done,
          },
          ReturnValues: "UPDATED_NEW",
        })
        .promise();
    } catch (error) {
      logger.error("Error ======> Updating Todo Failed.", {
        error: error,
        data: {
          todoId,
          userId,
          todoUpdate,
        },
      });
      throw Error(error);
    }
    return todoUpdate as TodoItem;
  }

  async deleteClient(userId: string, todoId: string): Promise<String> {
    logger.info(`Deleting todo item ${todoId} from ${this.todosTable}`);
    try {
      await this.docClient
        .delete({
          TableName: this.todosTable,
          Key: {
            userId,
            todoId,
          },
        })
        .promise();
      return "success";
    } catch (e) {
      logger.info("Error ==>>", {
        error: e,
      });
      return "Error";
    }
  }
  async getUploadUrl(todoId: string, userId: string): Promise<string> {
    const uploadUrl = this.S3.getSignedUrl("putObject", {
      Bucket: this.bucket_name,
      Key: todoId,
      Expires: Number(url_expiration),
    });
    await this.docClient
      .update({
        TableName: this.todosTable,
        Key: {
          userId,
          todoId,
        },
        UpdateExpression: "set attachmentUrl = :URL",
        ExpressionAttributeValues: {
          ":URL": uploadUrl.split("?")[0],
        },
        ReturnValues: "UPDATED_NEW",
      })
      .promise();
    return uploadUrl;
  }
}


function createDynamoDBClient() {
  if (process.env.IS_OFFLINE) {
    console.log("Creating a local DynamoDB instance");
    return new XAWS.DynamoDB.DocumentClient({
      region: "localhost",
      endpoint: "http://localhost:8000",
    });
  }

  return new XAWS.DynamoDB.DocumentClient();
}