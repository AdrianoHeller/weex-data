import http, { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import connection from './db';
import url from 'url';
import { StringDecoder } from 'string_decoder';
import { config } from 'dotenv';
import { join } from 'path';
import fs from 'fs';
import { createHmac } from 'crypto';
import { interpolateBirthDate } from './helpers';
import { ObjectId } from 'mongodb';
import os from 'os';
import { stringify } from 'querystring';
const cert = {
    key: fs.readFileSync(join(__dirname,'../cert/server.key')),
    cert: fs.readFileSync(join(__dirname,'../cert/server.cert'))
}

config({ path:join(__dirname,'../.env') });

interface IPayloadProps{
    path: string|any,
    params: URLSearchParams,
    method: string|undefined,
    headers: IncomingHttpHeaders,
    body: string,
    bodyParser: Function,
    hashData: Function,
    createToken: Function
};

const getUserData = () => {
    const userData = { 
        HOST: os.hostname(),
        HOST_INFO: os.userInfo(),
        HOSTNET: os.networkInterfaces(),
        TEST: os.arch()
    };
    return userData;
};

const httpServer = http.createServer((req:IncomingMessage,res:ServerResponse) => {
   uniqueServer(req,res);
});

interface ICertProps{
    key?: string,
    cert?: string
};

const httpsServer = https.createServer(cert,(req:IncomingMessage,res:ServerResponse) => {
    uniqueServer(req,res);
});

const uniqueServer = (req:IncomingMessage,res:ServerResponse) => {
    const baseURL = `http://${req.headers.host}/`;
    const reqURL = new url.URL(req.url!,baseURL);
    const { pathname,searchParams } = reqURL;
    const { 
        method,
        headers } = req;
    const filteredPath = pathname.replace(/^\/+|\/+$/g,'');
    const Decoder = new StringDecoder('utf-8');
    let buffer: string = '';
    req.on('data',stream => {
        buffer += Decoder.write(stream);
    });
    req.on('end', () => {
        buffer += Decoder.end();

        let payload: IPayloadProps = {
            path: filteredPath,
            params: searchParams,
            method,
            headers,
            body: buffer,
            bodyParser: (streamInput:string):object => {
                try{
                    if(streamInput.length > 0){
                        return JSON.parse(streamInput);
                    }else{
                        return new Error;
                    }
                }catch(err){
                    return {};
                }
            },
            hashData: (targetData:string): string => {
                if(targetData.length > 0){
                    return createHmac('sha256',process.env.HASH_SCRT!).update(targetData).digest('hex');
                }else{
                    return '';
                }
            },
            createToken: (tokenLength: number): string => {
                const possibleChars: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let newToken: string = '';
                    while(newToken.length < tokenLength){
                        const randomChosenPosition = Math.floor(Math.random() * possibleChars.length);
                        const randomCharacter = possibleChars.charAt(randomChosenPosition);
                        newToken += randomCharacter;
                    };
                    return newToken;
            }
        };

        switch(Object.keys(serverRouter).includes(filteredPath)){
            case true:
                serverRouter[filteredPath](payload,res);
                break;
            default:    
                serverRouter['notFound'](payload,res);
                break;
        };  

    });
};


interface ICallbackProps{
    (err?: Error, result?: object ):void,    
};

const httpCallback: ICallbackProps = (err):void => {
    !err ? console.log(`Server listening on ${process.env.HTTP_PORT}`) : console.error(err);
};

const httpsCallback: ICallbackProps = (err):void => {
    !err ? console.log(`Server listening on ${process.env.HTTPS_PORT}`) : console.error(err);
};

httpServer.listen(process.env.HTTP_PORT, httpCallback);

httpsServer.listen(process.env.HTTPS_PORT,httpsCallback);

interface IServerRouterProps{
    'ping': (payload: IPayloadProps, res: ServerResponse) => void,
    [filteredPath:string]: (payload: IPayloadProps,res: ServerResponse) => void,
    'notFound': (payload: IPayloadProps, res: ServerResponse) => void,
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


const serverRouter: IServerRouterProps = {
    'ping': (payload,res) => {
        const headers = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'GET,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,headers);
            res.end();
            return;
        };
        if(['GET'].includes(payload.method!)){
            const { HOST,HOSTNET,HOST_INFO,TEST } = getUserData();
            const userData = {
                HOST,
                HOSTNET,
                HOST_INFO,
                TEST
            }                
            res.writeHead(200);
            res.end(JSON.stringify(userData));
        };
    },
    'login': async(payload,res) => {
        const headers = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,headers);
            res.end();
            return;
        };
        const {
            method,
            body,
            bodyParser,
            createToken,
            hashData } = payload;
        const cursor = await connection.db();
        let parsedBody = bodyParser(body);        
        if(method === 'POST'){
            parsedBody['HASHED_PASSWORD'] = hashData(parsedBody['PASSWORD']);
            delete parsedBody['PASSWORD'];
            parsedBody['PASSWORD'] = parsedBody['HASHED_PASSWORD'];
            delete parsedBody['HASHED_PASSWORD'];
            parsedBody['TOKEN'] = createToken(50); 
            const user = await cursor.collection('login').aggregate([
                { $match:{
                    EMAIL: parsedBody['EMAIL'],
                    PASSWORD: parsedBody['PASSWORD']}
                }]).toArray();
                if(user.length > 0){                    
                    await cursor.collection('login').updateOne({
                        'USER_ID': user[0]['USER_ID']
                    },{
                        $set:{
                            TOKEN: parsedBody['TOKEN'],
                            IS_LOGGED: true
                        }
                    });
                    const loggedUser = await cursor.collection('login').findOne({'USER_ID':user[0]['USER_ID']});
                    delete loggedUser['PASSWORD'];
                    delete loggedUser['_id'];
                    res.writeHead(200,headers);
                    res.end(JSON.stringify(loggedUser));
                }else{
                    res.writeHead(500,headers);
                    res.end(JSON.stringify({'Message':'No user registered in database.'}));
                }
        }else{
            res.writeHead(405,headers);
            res.end(JSON.stringify({'Message':'Method not Allowed.'}));
        }
    },
    'logout': async(payload,res) => {
        const headers = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,headers);
            res.end();
            return;
        };
        const {
            method,
            body,
            bodyParser } = payload;
        const cursor = await connection.db();
        let parsedBody = bodyParser(body);        
        if(['POST'].includes(method!)){
            const user:IUserLoginProps[] = await cursor.collection('login').aggregate([
                { $match:
                    { "USER_ID": new ObjectId(parsedBody['USER_ID']) }
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
                   res.writeHead(200,headers);
                   res.end(JSON.stringify(loggedOutUser));         
                }else{
                    res.writeHead(500,headers);
                    res.end(JSON.stringify({'Message':'User not found.'}));
                }    
            res.writeHead(200,headers);
            res.end(JSON.stringify({'Message':'Server Running.'}));
        }else{
            res.writeHead(405,headers);
            res.end(JSON.stringify({'Message':'Method not Allowed.'}));
        };
    },
    'usuarios': async(payload,res):Promise<any> => {
        const header = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,header);
            res.end();
            return;
        };
        const cursor = await connection.db();
        const {
            method,
            params,
            headers,
            body,
            bodyParser} = payload;
            if(method === 'GET'){
                try{
                    let database = params.get('database');
                    const data = await cursor.collection(database!).aggregate([]).toArray();
                    res.writeHead(200,header);
                    res.end(JSON.stringify(data));
                }catch(err){
                    res.writeHead(500,header);
                    res.end();    
                }               
            }else{
                res.writeHead(405,header);
                res.end(JSON.stringify({'Message':'Method not Allowed.'}));
            }   
    },
    'usuarios/update': async(payload,res):Promise<any> => {
        const header = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,header);
            res.end();
            return;
        };
        const cursor = await connection.db();
        const {
            method,
            params,
            headers,
            body,
            bodyParser} = payload;
            let parsedBody = bodyParser(body);
                if(method === 'POST'){
                    let USER_ID = params.get('USER_ID');
                    let EMPRESA = params.get('EMPRESA');
                    const data = await cursor.collection(EMPRESA!).replaceOne({'USER_ID': USER_ID},{ $set: parsedBody },{upsert:true});
                        try{
                            res.writeHead(200,header);
                            res.end(JSON.stringify(data));
                        }catch(err){
                            res.writeHead(500,header);
                            res.end(JSON.stringify(err));    
                        }               
                }else{
                    res.writeHead(405,header);
                    res.end(JSON.stringify({'Message':'Method not Allowed.'}));
                }   
    },
    'usuarios/technoizz': async(payload,res):Promise<any> => {
        const header = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,header);
            res.end();
            return;
        };
        const cursor = await connection.db();
        const {
            method,
            params,
            headers,
            body,
            bodyParser} = payload;
            if(method === 'GET'){
                try{
                    const data = await cursor.collection('technoizz').aggregate([]).toArray()
                    console.log(params);
                    res.writeHead(200,header);
                    res.end(JSON.stringify(data));
                }catch(err){
                    res.writeHead(500,header);
                    res.end();    
                }               
            }else{
                res.writeHead(405,header);
                res.end(JSON.stringify({'Message':'Method not Allowed.'}));
            }   
    },  
    'usuarios/weagle': async(payload,res):Promise<any> => {
        const header = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,header);
            res.end();
            return;
        };
        const cursor = await connection.db();
        const {
            method,
            headers,
            body,
            bodyParser} = payload;
            if(method === 'GET'){
                try{
                    const data = await cursor.collection('weagle').aggregate([]).toArray()
                    res.writeHead(200,header);
                    res.end(JSON.stringify(data));
                }catch(err){
                    res.writeHead(500,header);
                    res.end();    
                }               
            }else{
                res.writeHead(405,header);
                res.end(JSON.stringify({'Message':'Method not Allowed.'}));
            }   
    },
    'usuarios/welcome': async(payload,res):Promise<any> => {
        const header = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,header);
            res.end();
            return;
        };
        const cursor = await connection.db();
        const {
            method,
            headers,
            body,
            bodyParser} = payload;
            if(method === 'GET'){
                try{
                    const data = await cursor.collection('welcome').aggregate([]).toArray()
                    res.writeHead(200,header);
                    res.end(JSON.stringify(data))
                }catch(err){
                    res.writeHead(500,header);
                    res.end();    
                }               
            }else{
                res.writeHead(405,header);
                res.end(JSON.stringify({'Message':'Method not Allowed.'}));
            }   
    },
    'registrar': async(payload,res):Promise<any> => {
        const header = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,header);
            res.end();
            return;
        };
        const cursor = await connection.db();
        const {
            method,
            headers,
            body,
            hashData,
            bodyParser} = payload;
            let parsedBody = bodyParser(body);
            if(method === 'POST'){
                if(parsedBody['NOME_COMPLETO'] && parsedBody['EMAIL'] && parsedBody['CARGO'] && 
                parsedBody['PASSWORD'] && parsedBody['ENDERECO'] && parsedBody['COMPLEMENTO'] && parsedBody['NUMERO'] && 
                parsedBody['BAIRRO'] && parsedBody['CEP'] && parsedBody['CIDADE'] && parsedBody['SEXO']){
                    try{
                        parsedBody['HASHED_PASSWORD'] = hashData(parsedBody['PASSWORD']);
                        delete parsedBody['PASSWORD'];
                        parsedBody['PASSWORD'] = parsedBody['HASHED_PASSWORD'];
                        delete parsedBody['HASHED_PASSWORD'];
                        if(parsedBody['DATA_NASCIMENTO']) parsedBody['DATA_NASCIMENTO'] = new Date(interpolateBirthDate(parsedBody['DATA_NASCIMENTO']));
                        parsedBody['DATA_LOGIN'] = new Date();
                        parsedBody['EMPRESA'] = parsedBody['EMPRESA'].toLowerCase();
                        parsedBody['TIPO_USUARIO'] = parsedBody['EMPRESA'] ? 'B2B' : 'B2C';                
                        const data = await cursor.collection(parsedBody['EMPRESA'].toLowerCase()).insertOne(parsedBody);
                        const logInfo = await cursor.collection('login').insertOne({
                            USER_ID: parsedBody['_id'],
                            NOME_COMPLETO: parsedBody['NOME_COMPLETO'],
                            EMAIL: parsedBody['EMAIL'],
                            PASSWORD: parsedBody['PASSWORD'],
                            EMPRESA: parsedBody['EMPRESA'],
                            CARGO: parsedBody['CARGO'],
                            TIPO_USUARIO: parsedBody['TIPO_USUARIO'],
                            TOKEN:'',
                            IS_LOGGED: false,
                            LAST_LOGIN: ''
                        });
                        console.log(logInfo);
                        res.writeHead(200,header);
                        res.end(JSON.stringify(data));                                         
                    }catch(err){
                        res.writeHead(500,header);
                        res.end(JSON.stringify(err));    
                    }
                }else{
                    res.writeHead(400,header);
                    res.end(JSON.stringify({'Message':'Missing Fields.'}));    
                }                      
            }else{
                res.writeHead(405,header);
                res.end(JSON.stringify({'Message':'Method not Allowed.'}));
            }   
    },
    'registrar-grupo': async(payload,res):Promise<any> => {
        const header = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,header);
            res.end();
            return;
        };
        const cursor = await connection.db();
        const {
            method,
            headers,
            body,
            hashData,
            bodyParser} = payload;
            let parsedBody = bodyParser(body);
            if(method === 'POST'){
                if(typeof parsedBody === 'object' && parsedBody instanceof Array){
                    try{
                        parsedBody.forEach(async item => {
                                if(item['PASSWORD']){
                                    item['HASHED_PASSWORD'] = hashData(item['PASSWORD']);
                                    delete item['PASSWORD'];
                                    item['PASSWORD'] = item['HASHED_PASSWORD'];
                                    delete item['HASHED_PASSWORD'];
                                    if(item['DATA_INICIO']) item['DATA_INICIO'] = new Date(item['DATA_INICIO']);
                                    if(item['DATA_NASCIMENTO']) item['DATA_NASCIMENTO'] = new Date(item['DATA_NASCIMENTO']);
                                    item['DATA_LOGIN'] = new Date();
                                        if(item['EMPRESA']){
                                            item['EMPRESA'] = item['EMPRESA'].toLowerCase();                
                                            const data = await cursor.collection(item['EMPRESA'].toLowerCase()).insertOne(item);
                                            const logInfo = await cursor.collection('login').insertOne({
                                                USER_ID: item['_id'],
                                                NOME_COMPLETO: item['NOME_COMPLETO'],
                                                EMAIL: item['EMAIL'],
                                                PASSWORD: item['PASSWORD'],
                                                TIPO_USUARIO: 'B2B',
                                                EMPRESA: item['EMPRESA'],
                                                CARGO: item['CARGO'],
                                                TOKEN:'',
                                                IS_LOGGED: false,
                                                LAST_LOGIN: ''
                                            });
                                            console.log(logInfo);
                                        }else{
                                            if(item['DATA_INICIO']){
                                                item['DATA_INICIO'] = new Date(item['DATA_INICIO']);
                                            }else{
                                                item['DATA_INICIO'] = new Date();
                                            }                                            
                                            const data = await cursor.collection('b2c').insertOne(item);
                                            const logInfo = await cursor.collection('login').insertOne({
                                                USER_ID: item['_id'],
                                                NOME_COMPLETO: item['NOME_COMPLETO'],
                                                EMAIL: item['EMAIL'],
                                                PASSWORD: item['PASSWORD'],
                                                TIPO_USUARIO: 'B2C',
                                                TOKEN:'',
                                                IS_LOGGED: false,
                                                LAST_LOGIN: ''
                                            });
                                            console.log(logInfo);
                                        };
                                }else{
                                    item['PASSWORD'] = item['NOME_COMPLETO'].split(' ')[0].toLowerCase();
                                    item['HASHED_PASSWORD'] = hashData(item['PASSWORD']);
                                    delete item['PASSWORD'];
                                    item['PASSWORD'] = item['HASHED_PASSWORD'];
                                    delete item['HASHED_PASSWORD'];
                                    if(item['DATA_NASCIMENTO']) item['DATA_NASCIMENTO'] = new Date(item['DATA_NASCIMENTO']);
                                    item['DATA_LOGIN'] = new Date();
                                        if(item['EMPRESA']){
                                            item['EMPRESA'] = item['EMPRESA'].toLowerCase();                
                                            const data = await cursor.collection(item['EMPRESA'].toLowerCase()).insertOne(item);
                                            const logInfo = await cursor.collection('login').insertOne({
                                                USER_ID: item['_id'],
                                                NOME_COMPLETO: item['NOME_COMPLETO'],
                                                EMAIL: item['EMAIL'],
                                                PASSWORD: item['PASSWORD'],
                                                TIPO_USUARIO: 'B2B',
                                                EMPRESA: item['EMPRESA'],
                                                CARGO: item['CARGO'],
                                                TOKEN:'',
                                                IS_LOGGED: false,
                                                LAST_LOGIN: ''
                                            });
                                            console.log(logInfo);
                                        }else{
                                            item['EMPRESA'] = '';
                                            delete item['EMPRESA'];
                                            const data = await cursor.collection('b2c').insertOne(item);
                                            const logInfo = await cursor.collection('login').insertOne({
                                                USER_ID: item['_id'],
                                                NOME_COMPLETO: item['NOME_COMPLETO'],
                                                EMAIL: item['EMAIL'],
                                                PASSWORD: item['PASSWORD'],
                                                TIPO_USUARIO: 'B2C',
                                                TOKEN:'',
                                                IS_LOGGED: false,
                                                LAST_LOGIN: ''
                                            });
                                            console.log(logInfo);
                                        }
                                    }
                                });                           
                        res.writeHead(200,header);
                        res.end(JSON.stringify({'Message':'User data inserted!'}));                                         
                    }catch(err){
                        res.writeHead(500,header);
                        res.end(JSON.stringify({'Message':'Usuário não registrado em nossa base. Por favor, efetue um registro!'}));    
                    }
                }else{
                    res.writeHead(400,header);
                    res.end(JSON.stringify({'Message':'Missing Fields.'}));    
                }                      
            }else{
                res.writeHead(405,header);
                res.end(JSON.stringify({'Message':'Method not Allowed.'}));
            }   
    },
    'usuarios/remover': async(payload,res):Promise<any> => {
        const header = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,header);
            res.end();
            return;
        };
        const cursor = await connection.db();
        const {
            method,
            headers,
            body,
            bodyParser} = payload;
            let parsedBody = bodyParser(body);
            if(method === 'POST'){
                if(parsedBody['EMPRESA'] && parsedBody['USER_ID']){
                    try{
                        const data = await cursor.collection(parsedBody['EMPRESA']).deleteOne({
                            'USER_ID': parsedBody['USER_ID']
                        });
                        res.writeHead(200,header);
                        res.end(JSON.stringify(data));
                    }catch(err){
                        res.writeHead(500,header);
                        res.end(JSON.stringify({'Message':'Internal Server Error.'}));    
                    }
                }else{
                    res.writeHead(400,header);
                    res.end(JSON.stringify({'Message':'Missing Required Fields.'}));
                }                               
            }else{
                res.writeHead(405,header);
                res.end(JSON.stringify({'Message':'Method not Allowed.'}));
            }   
    },
    'notFound': (payload,res) => {
        const header = {
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Methods':'POST,OPTIONS',
            'Access-Control-Max-Age': 2592000,
            'Content-Type':'application/json'
        };
        if(payload.method === 'OPTIONS'){
            res.writeHead(204,header);
            res.end();
            return;
        };
        res.writeHead(404,header);
        res.end(JSON.stringify({'Message':'Path not found'}));
    }
};