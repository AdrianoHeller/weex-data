import http, { IncomingHttpHeaders, ServerResponse } from 'http';
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
import { parse } from 'querystring';

config({path:join(__dirname,'../.env')});

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

const httpServer = http.createServer((req,res) => {
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
});


interface ICallbackProps{
    (err?: Error, result?: object ):void,    
};

const httpCallback: ICallbackProps = (err):void => {
    !err ? console.log(`Server listening on ${process.env.HTTP_PORT}`) : console.error(err);
};

httpServer.listen(process.env.HTTP_PORT, httpCallback);

interface IServerRouterProps{
    'ping': (payload: IPayloadProps, res: ServerResponse) => void,
    [filteredPath:string]: (payload: IPayloadProps,res: ServerResponse) => void,
    'notFound': (payload: IPayloadProps, res: ServerResponse) => void,
};


interface IDbDataAuthProps{
    NOME_COMPLETO: string,
    EMAIL: string,
    PASSWORD: string,
    EMPRESA: string,
    CARGO: string,
    DATA_REGISTRO?: Date,
    TOKEN?: string,
    LOGADO?: boolean,
    HORA_LOGIN?: Date
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
            res.writeHead(200);
            res.end(JSON.stringify({'Message':'Server Running'}));
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
            parsedBody['HORA_LOGIN'] = new Date();
            const user = await cursor.collection('login').aggregate([
                { $match:{
                    EMAIL: parsedBody['EMAIL'],
                    PASSWORD: parsedBody['PASSWORD']}
                }]).toArray();
                if(user.length > 0){
                    delete user[0]['PASSWORD'];
                    delete user[0]['_id'];
                    user[0]['TOKEN'] = parsedBody['TOKEN'];
                    user[0]['HORA_LOGIN'] = parsedBody['HORA_LOGIN'];
                    res.writeHead(200,headers);
                    res.end(JSON.stringify(user[0]));
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
        const cursor = await connection;
        let parsedBody = bodyParser(body);        
        if(['POST'].includes(payload.method!)){
            res.writeHead(200,headers);
            res.end(JSON.stringify({'Message':'Server Running.'}));
        }else{
            res.writeHead(405,headers);
            res.end(JSON.stringify({'Message':'Method not Allowed.'}));
        };
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
            headers,
            params,
            body,
            bodyParser} = payload;
            if(method === 'GET'){
                console.log(params); 
                try{
                    const data = await cursor.collection('technoizz').aggregate([]).toArray()
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
                if(parsedBody['NOME_COMPLETO'] && parsedBody['EMAIL'] && parsedBody['EMPRESA'] && parsedBody['CARGO'] && 
                parsedBody['PASSWORD'] && parsedBody['ENDERECO'] && parsedBody['COMPLEMENTO'] && parsedBody['NUMERO'] && 
                parsedBody['BAIRRO'] && parsedBody['CEP'] && parsedBody['CIDADE'] && parsedBody['SEXO']){
                    try{
                        parsedBody['HASHED_PASSWORD'] = hashData(parsedBody['PASSWORD']);
                        delete parsedBody['PASSWORD'];
                        parsedBody['PASSWORD'] = parsedBody['HASHED_PASSWORD'];
                        delete parsedBody['HASHED_PASSWORD'];
                        parsedBody['DATA_NASCIMENTO'] = new Date(interpolateBirthDate(parsedBody['DATA_NASCIMENTO']));
                        parsedBody['DATA_LOGIN'] = new Date();
                        parsedBody['EMPRESA'] = parsedBody['EMPRESA'].toLowerCase();                
                        const data = await cursor.collection(parsedBody['EMPRESA'].toLowerCase()).insertOne(parsedBody);
                        const logInfo = await cursor.collection('login').insertOne({
                            USER_ID: parsedBody['_id'],
                            NOME_COMPLETO: parsedBody['NOME_COMPLETO'],
                            EMAIL: parsedBody['EMAIL'],
                            PASSWORD: parsedBody['PASSWORD'],
                            EMPRESA: parsedBody['EMPRESA'],
                            CARGO: parsedBody['CARGO'],
                            TOKEN:'',
                            IS_LOGGED: false,
                            LAST_LOGIN: ''
                        });
                        console.log(logInfo);
                        res.writeHead(200,header);
                        res.end(JSON.stringify(data));                                         
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
                            item['HASHED_PASSWORD'] = hashData(item['PASSWORD']);
                            delete item['PASSWORD'];
                            item['PASSWORD'] = item['HASHED_PASSWORD'];
                            delete item['HASHED_PASSWORD'];
                            if(item['DATA_NASCIMENTO']) item['DATA_NASCIMENTO'] = new Date(interpolateBirthDate(item['DATA_NASCIMENTO']));
                            item['DATA_LOGIN'] = new Date();
                            item['EMPRESA'] = item['EMPRESA'].toLowerCase();                
                            const data = await cursor.collection(item['EMPRESA'].toLowerCase()).insertOne(item);
                            const logInfo = await cursor.collection('login').insertOne({
                                USER_ID: item['_id'],
                                NOME_COMPLETO: item['NOME_COMPLETO'],
                                EMAIL: item['EMAIL'],
                                PASSWORD: item['PASSWORD'],
                                EMPRESA: item['EMPRESA'],
                                CARGO: item['CARGO'],
                                TOKEN:'',
                                IS_LOGGED: false,
                                LAST_LOGIN: ''
                            });
                            console.log(logInfo);
                        })                       
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
    'notFound': (payload,res) => {
        res.setHeader('Access-Control-Allow-Origin','http://localhost:3000');
        res.setHeader('Content-Type','application/json');
        res.writeHead(404);
        res.end(JSON.stringify({'Message':'Path not found'}));
    }
};