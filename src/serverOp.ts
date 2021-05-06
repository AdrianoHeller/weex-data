import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './db';
import { ObjectId } from 'mongodb';
import { createHmac } from 'crypto';

const hashData = (targetData:string): string => {
    if(targetData.length > 0){
        return createHmac('sha256',process.env.HASH_SCRT!).update(targetData).digest('hex');
    }else{
        return '';
    }
};

const createToken = (tokenLength: number): string => {
    const possibleChars: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newToken: string = '';
        while(newToken.length < tokenLength){
            const randomChosenPosition = Math.floor(Math.random() * possibleChars.length);
            const randomCharacter = possibleChars.charAt(randomChosenPosition);
            newToken += randomCharacter;
        };
        return newToken;
};

interface IUserLoginProps{
    USER_ID: string,
    NOME_COMPLETO: string,
    EMAIL: string,
    PASSWORD: string,
    EMPRESA: string,
    CARGO: string,
    TIPO_USUARIO: string,
    IS_LOGGED: boolean,
    TOKEN: string,
    LAST_LOGIN: Date
};

const PORT = Number(process.env.PORT) | 5001;

const HOST = '0.0.0.0';

const app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.use(cors());

app.use(morgan('combined'));

app.use(helmet());

app.disable('x-powered-by');

app.get('/',(req,res) => {
    if(['GET','get'].includes(req.method)){
        res.send('Server Running');
    }else{
        res.sendStatus(405);
        res.end();
    }    
});

app.post('/login',async(req,res): Promise<any> => {
    const cursor = await db.db();
        if(req.method === 'POST'){
        req.body['HASHED_PASSWORD'] = hashData(req.body['PASSWORD']);
            delete req.body['PASSWORD'];
            req.body['PASSWORD'] = req.body['HASHED_PASSWORD'];
            delete req.body['HASHED_PASSWORD'];
            req.body['TOKEN'] = createToken(50); 
            const user = await cursor.collection('login').aggregate([
                { $match:{
                    EMAIL: req.body['EMAIL'],
                    PASSWORD: req.body['PASSWORD']}
                }]).toArray();
                if(user.length > 0){                    
                    await cursor.collection('login').updateOne({
                        'USER_ID': user[0]['USER_ID']
                    },{
                        $set:{
                            TOKEN: req.body['TOKEN'],
                            IS_LOGGED: true
                        }
                    });
                    const loggedUser = await cursor.collection('login').findOne({'USER_ID':user[0]['USER_ID']});
                    delete loggedUser['PASSWORD'];
                    delete loggedUser['_id'];
                    res.send(JSON.stringify(loggedUser));
                }else{
                    // res.sendStatus(500);
                    res.send(JSON.stringify({'Message':'No user registered in database.'}));
                }
        }else{
            res.sendStatus(405);
            res.end();
        }
});

app.post('/logout',async(req,res): Promise<any> => {
    const cursor = await db.db();
    if(['POST'].includes(req.method)){
        const user:IUserLoginProps[] = await cursor.collection('login').aggregate([
            { $match:
                { "USER_ID": new ObjectId(req.body['USER_ID']) }
            }
        ]).toArray();
            if(user.length > 0){
               await cursor.collection('login').updateOne({
                   "USER_ID": new ObjectId(user[0]['USER_ID'])
                },{
                    $set:{
                        TOKEN:"",
                        IS_LOGGED:false,
                        LAST_LOGIN: new Date()
                    }
                });
               const loggedOutUser = await cursor.collection('login').findOne({"USER_ID": new ObjectId(user[0]['USER_ID'])});
               delete loggedOutUser['PASSWORD'];
               delete loggedOutUser['_id'];
               res.sendStatus(200);
               res.end(JSON.stringify(loggedOutUser));         
            }else{
                res.sendStatus(500);
                res.send(JSON.stringify({'Message':'User not found.'}));
            }    
        res.sendStatus(200);
        res.send(JSON.stringify({'Message':'Server Running.'}));
    }else{
        res.sendStatus(405);
        res.send(JSON.stringify({'Message':'Method not Allowed.'}));
    };
});

app.get('/usuarios/:empresa',async(req,res) => {
    const empresa = req.params.empresa;
    const cursor = await db.db();
        if(req.method === 'GET'){
            try{
                const data = await cursor.collection(empresa).aggregate([]).toArray();
                res.send(JSON.stringify(data));
            }catch(err){
                res.send(err);    
            }               
        }else{
            res.sendStatus(405);
            res.end(JSON.stringify({'Message':'Method not Allowed.'}));
        }
});

app.get('/usuarios/:empresa/:id',async(req,res) => {
    const empresa = req.params.empresa;
    const id = req.params.id;
    const data: IUserLoginProps = req.body;
    const cursor = await db.db();
        if(req.method === 'GET'){
            try{
                const data = await cursor.collection(empresa).findOne({id: new ObjectId(id)});
                res.send(JSON.stringify(data));
            }catch(err){
                res.send(err);    
            }               
        }else{
            res.sendStatus(405);
            res.end(JSON.stringify({'Message':'Method not Allowed.'}));
        }
});

app.put('/usuarios/:empresa/:id',async(req,res) => {
    const empresa = req.params.empresa;
    const id = req.params.id;
    const payload: IUserLoginProps = req.body;
    const cursor = await db.db();
        if(req.method === 'GET'){
            try{
                const data = await cursor.collection(empresa).findOneAndReplace(
                    {id: new ObjectId(id)},
                    {$set:{ payload }}
                    );
                res.send(JSON.stringify(data));
            }catch(err){
                res.send(err);    
            }               
        }else{
            res.sendStatus(405);
            res.end(JSON.stringify({'Message':'Method not Allowed.'}));
        }
});


app.listen(PORT,HOST);


