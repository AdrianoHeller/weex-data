import http, { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import connection from './db';
import url from 'url';
import { StringDecoder } from 'string_decoder';
import { config } from 'dotenv';
import { join } from 'path';
import { createHmac } from 'crypto';
import { weexControllers } from './controllers';

config({ path:join(__dirname,'../.env') });

export interface IPayloadProps{
    path: string|any,
    params: URLSearchParams,
    method: string|undefined,
    headers: IncomingHttpHeaders,
    body: string,
    bodyParser: Function,
    hashData: Function,
    createToken: Function
};

const httpServer = http.createServer((req:IncomingMessage,res:ServerResponse) => {
   uniqueServer(req,res);
});

interface ICertProps{
    key?: string,
    cert?: string
};

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

        switch(Object.keys(weexRouter).includes(filteredPath)){
            case true:
                weexRouter[filteredPath](payload,res);
                break;
            default:    
                weexRouter['/server/notFound'](payload,res);
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

httpServer.listen(process.env.HTTP_PORT, httpCallback);

interface IServerRouterProps{
    '/server/ping': (payload: IPayloadProps, res: ServerResponse) => void,
    [filteredPath:string]: (payload: IPayloadProps,res: ServerResponse) => void,
    '/server/notFound': (payload: IPayloadProps, res: ServerResponse) => void,
};

const weexRouter: IServerRouterProps = {
    '/server/ping': weexControllers['/server/ping']!,
    '/server/login': weexControllers['/server/login']!.bind(null,connection),
    '/server/logout': weexControllers['/server/logout']!.bind(null,connection),
    '/server/usuarios': weexControllers['/server/usuarios']!.bind(null,connection),
    '/server/usuarios/update': weexControllers['/server/usuarios/update']!.bind(null,connection),
    '/server/usuarios/technoizz':weexControllers['/server/usuarios/technoizz']!.bind(null,connection),  
    '/server/usuarios/weagle': weexControllers['/server/usuarios/weagle']!.bind(null,connection),
    '/server/usuarios/welcome':weexControllers['/server/usuarios/welcome']!.bind(null,connection),
    '/server/registrar': weexControllers['/server/registrar']!.bind(null,connection),
    '/server/registrar-grupo':weexControllers['/server/registrar-grupo']!.bind(null,connection),
    '/server/usuarios/remover':weexControllers['/server/usuarios/remover']!.bind(null,connection),
    '/server/notFound': weexControllers['/server/notFound']!
};