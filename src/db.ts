import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname,'../.env')});

const connectionString: string = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PWD}@cluster0.t0iml.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`;

const connection = new MongoClient(connectionString,{
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Main = async():Promise<any> => {
    try{
        await connection.connect();
        return connection;        
    }catch(err){
        throw new Error(err);
    };
};

Main()
.then(db => console.log(db))
.catch(err => console.error(err));

export default connection;