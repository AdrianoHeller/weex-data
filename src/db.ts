import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname,'../.env')});

const stagingUri: string = process.env.MONGO_DB_STAGING_URI!;

const productionUri: string = process.env.MONGO_DB_PRODUCTION_URI!;

const environmentString: string = process.env.NODE_ENV! === 'production' ? productionUri : stagingUri ;

const connection = new MongoClient(environmentString,{
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