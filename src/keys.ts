import { config } from 'dotenv';
import { join } from 'path';

config({path: join(__dirname,'../.env')});

interface IEnvProps{
    SERVER_URL: string,
    PORT: number,
    HASH_SCRT: string,
    MONGO_USER: string,
    MONGO_PWD: string,
    MONGO_DB_NAME?: string
};

const environmentValues:IEnvProps = {
    HASH_SCRT: process.env.HASH_SCRT!,
    PORT: Number(process.env.PORT),
    SERVER_URL: process.env.SERVER_URL!,
    MONGO_USER: process.env.MONGO_USER!,
    MONGO_PWD: process.env.MONGO_PWD!
};

export const checkActualRunningEnvironment = () => {
    if(!process.env.NODE_ENV){
        return process.env.NODE_ENV = 'development';
    }else{
        return process.env.NODE_ENV;
    }
};


