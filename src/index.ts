import http, { IncomingHttpHeaders, ServerResponse } from 'http';
import https from 'https';
import connection from './db';
import url from 'url';
import { StringDecoder } from 'string_decoder';
import { config } from 'dotenv';
import { join } from 'path';
import fs from 'fs';
import { createHmac } from 'crypto';

config({path:join(__dirname,'../.env')});

interface IPayloadProps{
    path: string|any,
    params: URLSearchParams,
    method: string|undefined,
    headers: IncomingHttpHeaders,
    body: string,
    bodyParser: Function,
    hashData: Function
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
                    return createHmac('sha-256',process.env.HASH_SCRT!).update(targetData).digest('hex');
                }else{
                    return '';
                }
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
    username: string,
    password: string,
    register_date?: Date,
    token?: string,
    isLogged: boolean
};

const serverRouter: IServerRouterProps = {
    'ping': (payload,res) => {
        res.setHeader('Content-Type','application/json');
        res.writeHead(200);
        res.end(JSON.stringify({'Message':'Server Running'}));
    },
    'login': async(payload,res) => {
        res.setHeader('Content-Type','application/json');
        const {
            method,
            body,
            bodyParser,
            hashData } = payload;
        const cursor = await connection;
        let parsedBody = bodyParser(body);        
        if(method === 'POST'){
            parsedBody['senhaHash'] = hashData(parsedBody['senha']);
            delete parsedBody['senha'];
            parsedBody['senha'] = parsedBody['senhaHash'];
            delete parsedBody['senhaHash'];
            parsedBody['token'] = '';
            parsedBody['loginHour'] = new Date().getUTCDate(); 
            cursor.query(`select * from auth_login where email in ('${parsedBody['email']}') and senha in ('${parsedBody['senha']}')`,(err,data) => {
            if(!err){
                let dbData: IDbDataAuthProps[] = JSON.parse(JSON.stringify(data));
                    if(Object.keys(dbData[0]).length > 0){                        
                        cursor.query(`update auth_login set isLogged_sn = 1,
                        token = '37dh46frgt2gst2ff0yku9nj58fgjr9jf' where email = '${parsedBody['email']}'
                        and senha = '${parsedBody['senha']}'`,(err,data) => {
                            if(!err){
                                res.writeHead(200);
                                res.end(JSON.stringify({'Message':'User Logged Successfully'}));
                            }else{
                                res.writeHead(500);
                                res.end(JSON.stringify({'Message':'User could not be logged'}));
                            }
                        });                                
                    }else{
                        res.writeHead(500);
                        res.end(JSON.stringify({'Message':'Data does not match'}));
                    }
            }else{
                res.writeHead(400);
                res.end(JSON.stringify({'Message':'User not found in database.'}));
            }           
            });
        }else{
            res.writeHead(405);
            res.end(JSON.stringify({'Message':'Protocol not Allowed'}));
        } 
    },
    'logout': async(payload,res) => {
        res.setHeader('Content-Type','application/json');
        const {
            method,
            body,
            bodyParser } = payload;
        const cursor = await connection;
        let parsedBody = bodyParser(body);        
        if(method === 'POST'){
            cursor.query(`select * from auth_login where email in ('${parsedBody['email']}')
             and senha in ('${parsedBody['senha']}') and isLogged_sn = 1`,(err,data) => {
            if(!err){
                let dbData: IDbDataAuthProps[] = JSON.parse(JSON.stringify(data));
                    if(Object.keys(dbData[0]).length > 0){                        
                        cursor.query(`update auth_login set isLogged = 0,
                        token = '' where email = '${parsedBody['email']}'
                        and senha = '${parsedBody['senha']}'`,(err,data) => {
                            if(!err){
                                res.writeHead(200);
                                res.end(JSON.stringify({'Message':'User Unlogged with success.'}));
                            }else{
                                res.writeHead(500);
                                res.end(JSON.stringify({'Message':'User could not be unlogged'}));
                            }
                        });                                
                    }else{
                        res.writeHead(500);
                        res.end(JSON.stringify({'Message':'Data does not match'}));
                    }
            }else{
                res.writeHead(400);
                res.end(JSON.stringify({'Message':'User not found in database.'}));
            }           
            });
        }else{
            res.writeHead(405);
            res.end(JSON.stringify({'Message':'Protocol not Allowed'}));
        }  
    },
    'register': async(payload,res):Promise<any> => {
        res.setHeader('Content-Type','application/json');
        const cursor = await connection;
        const {
            method,
            headers,
            body,
            bodyParser} = payload;
        let parsedBody = bodyParser(body);    
        cursor.query(`select * from funcionario where email = '${parsedBody.email}' and password = '${parsedBody['password']}'`,(err,results) => {
            if(err){
                cursor.query(`insert into funcionario(nome,data_nascimento,email,cargo,fk_idempresa)values(
                    '${parsedBody.nome}','${parsedBody.data_nascimento}','${parsedBody.email}','${parsedBody.cargo}','${parsedBody.fk_idempresa}'
                )`,(err) => {
                    if(!err){
                        res.writeHead(200);
                        res.end(JSON.stringify({'Message':'User registered.'}));
                    }else{
                        res.writeHead(200);
                        res.end(JSON.stringify({'Message':'User registered.'}));
                    }
                });
            }else{
                res.writeHead(500);
                res.end(JSON.stringify({'Message':'User already exists. Choose another email and user or change your password.'}));
            }
        });       
    },
    'fullData': async(payload,res):Promise<any> => {
        res.setHeader('Content-Type','application/json');
        const cursor = await connection;
        const {
            method,
            headers,
            body,
            bodyParser} = payload;
            if(method === 'GET'){
                cursor.query(`select username,amount,earn,spent from login_data`,(err,result) => {
                    if(!err){
                        const fullData = JSON.parse(JSON.stringify(result));
                        res.writeHead(200);
                        res.end(JSON.stringify(fullData));
                    }else{
                        res.writeHead(400);
                        res.end(JSON.stringify({'Message':'User not found'}));
                    }
                });
            }else{
                res.writeHead(405);
                res.end(JSON.stringify({'Message':'Method not allowed.'}));
            }
    },
    'notFound': (payload,res) => {
        res.setHeader('Content-Type','application/json');
        res.writeHead(404);
        res.end(JSON.stringify({'Message':'Path not found'}));
    }
};