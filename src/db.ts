import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname,'../.env')});

const stagingUri: string = process.env.MONGO_DB_STAGING_URI!;

const productionUri: string = process.env.MONGO_DB_PRODUCTION_URI!;

const environmentString: string = process.env.NODE_ENV! === 'production' ? productionUri : stagingUri ;

const connection = new MongoClient("mongodb+srv://gustavo:gustavo@cluster0.t0iml.mongodb.net/weex?authSource=admin&replicaSet=atlas-8r48ai-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass&retryWrites=true&ssl=true",{
    useUnifiedTopology:true,
    useNewUrlParser: true
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