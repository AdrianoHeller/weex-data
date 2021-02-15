import http, { IncomingHttpHeaders, ServerResponse } from 'http';
import https from 'https';
import connection from './db';
import url, { fileURLToPath } from 'url';
import { StringDecoder } from 'string_decoder';
import { config } from 'dotenv';
import { join } from 'path';
import fs from 'fs';
import { connect } from 'http2';
import { stringify } from 'querystring';

config({path:join(__dirname,'../.env')});

// const serverInfo = {
//     cert: fs.readFileSync(join(__dirname,'../certs/')),
//     key: fs.readFileSync(join(__dirname,'../certs/'))
// };

interface IPayloadProps{
    path: string|any,
    params: URLSearchParams,
    method: string|undefined,
    headers: IncomingHttpHeaders,
    body: string,
    bodyParser: Function
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

// const httpsServer = https.createServer(serverInfo,(req,res) => {

// });

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

const serverRouter: IServerRouterProps = {
    'ping': (payload,res) => {
        res.setHeader('Content-Type','application/json');
        res.writeHead(200);
        res.end(JSON.stringify({'Message':'Server Running'}));
    },
    'weex': async(payload,res):Promise<any> => {
        res.setHeader('Content-Type','application/json');
        const cursor = await connection;
        const data = await cursor.query('select * from empresa',(err,data) => {
            if(!err){
                res.writeHead(200);
                res.end(JSON.stringify(JSON.parse(JSON.stringify(data))));
            }else{
                res.writeHead(404);
                res.end();
            }
        });       
    },
    'notFound': (payload,res) => {
        res.setHeader('Content-Type','application/json');
        res.writeHead(404);
        res.end(JSON.stringify({'Message':'Path not found'}));
    }
};