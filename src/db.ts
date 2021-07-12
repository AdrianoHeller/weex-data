import { MongoClient } from "mongodb";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(__dirname, "../.env") });

const localStringConn: string = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PWD}@cluster0.t0iml.mongodb.net/${process.env.MONGO_DB_NAME}}?retryWrites=true&w=majority`;

const connectionString: string = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PWD}@cluster0.t0iml.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`;

const environmentString =
  process.env.NODE_ENV === "dev"
    ? process.env.MONGO_URI_DEV
    : process.env.MONGO_URI_PROD;

const connection = new MongoClient(connectionString, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const Main = async (): Promise<any> => {
  try {
    await connection.connect();
    return connection;
  } catch (err) {
    throw new Error(err);
  }
};

Main()
  .then((db) => console.log(db))
  .catch((err) => console.error(err));

export default connection;
