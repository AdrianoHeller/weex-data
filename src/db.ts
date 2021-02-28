import mysql from 'mysql';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname,'../.env')});

const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DBNAME,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_USER_PWD,
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