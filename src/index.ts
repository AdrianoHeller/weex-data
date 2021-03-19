import http, { IncomingHttpHeaders, ServerResponse } from 'http';
import https from 'https';
import connection from './db';
import url from 'url';
import { StringDecoder } from 'string_decoder';
import { config } from 'dotenv';
import { join } from 'path';
import fs from 'fs';
import { createHmac } from 'crypto';
import cors from 'cors';

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
    const {pathname,searchParams} = reqURL;
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
    LOGADO: boolean,
    HORA_LOGIN: Date
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
            parsedBody['HORA_LOGIN'] = new Date().getUTCDate();
            const user = await cursor.collection('login').aggregate([
                { $match:{
                    NOME_COMPLETO: parsedBody['NOME_COMPLETO'],
                    PASSWORD: parsedBody['PASSWORD']}
                }]).toArray();
                if(user.length > 0){
                    res.writeHead(200,headers);
                    res.end(JSON.stringify(user));
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
        res.setHeader('Access-Control-Allow-Origin','http://localhost:3000');
        res.setHeader('Content-Type','application/json');
        const cursor = await connection.db();
        const {
            method,
            headers,
            body,
            bodyParser} = payload;
            if(method === 'GET'){
                try{
                    const data = await cursor.collection('welcome').aggregate([]).toArray()
                    res.writeHead(200);
                    res.end(JSON.stringify(data))
                }catch(err){
                    res.writeHead(500);
                    res.end();    
                }               
            }else{
                res.writeHead(405);
                res.end();
            }   
    },
    'registrar': async(payload,res):Promise<any> => {
        res.setHeader('Access-Control-Allow-Origin','http://localhost:3000');
        res.setHeader('Content-Type','application/json');
        const cursor = await connection.db();
        const {
            method,
            headers,
            body,
            hashData,
            bodyParser} = payload;
            let parsedBody = bodyParser(payload.body);
            if(method === 'POST'){
                if(parsedBody['NOME_COMPLETO'] && parsedBody['EMAIL'] && parsedBody['EMPRESA'] && parsedBody['CARGO'] && 
                parsedBody['PASSWORD'] && parsedBody['ENDERECO'] && parsedBody['COMPLEMENTO'] && parsedBody['NUMERO'] && 
                parsedBody['BAIRRO'] && parsedBody['CEP'] && parsedBody['CIDADE'] && parsedBody['SEXO']){
                try{
                    parsedBody['HASHED_PASSWORD'] = hashData(parsedBody['PASSWORD']);
                    delete parsedBody['PASSWORD'];
                    parsedBody['PASSWORD'] = parsedBody['HASHED_PASSWORD'];
                    delete parsedBody['HASHED_PASSWORD'];
                    parsedBody['HORA_LOGIN'] = new Date().getUTCDate();                
                    const data = await cursor.collection(parsedBody['EMPRESA']).insertOne(parsedBody);
                    res.writeHead(200);
                    res.end(JSON.stringify(data));                                         
                }catch(err){
                    res.writeHead(500);
                    res.end(JSON.stringify({'Message':'Usuário não registrado em nossa base. Por favor, efetue um registro!'}));    
                }    
            }           
            }else{
                res.writeHead(405);
                res.end();
            }   
    },
    'notFound': (payload,res) => {
        res.setHeader('Access-Control-Allow-Origin','http://localhost:3000');
        res.setHeader('Content-Type','application/json');
        res.writeHead(404);
        res.end(JSON.stringify({'Message':'Path not found'}));
    }
};