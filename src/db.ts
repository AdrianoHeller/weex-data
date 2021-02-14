import mysql from 'mysql';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname,'../.env')});

const connection = mysql.createConnection({
    host: process.env.MYSQL_DEV_ENV,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: process.env.MYSQL_CMP_DB
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
.then(async conn => {
    //@ts-ignore
    await conn.query('select * from empresa',(err,data,fields) => {
        console.log(JSON.parse(JSON.stringify(data)));
        console.log(JSON.parse(JSON.stringify(fields)));
    });
})
.catch(err => console.error(err));
