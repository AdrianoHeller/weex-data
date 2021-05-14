import { config } from 'dotenv';
import { join } from 'path';

config({path: join(__dirname,'../.env')});


export const checkActualRunningEnvironment = () => {
    if(!process.env.NODE_ENV){
        return process.env.NODE_ENV = 'development';
    }else{
        return process.env.NODE_ENV;
    }
};
