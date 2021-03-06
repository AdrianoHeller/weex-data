import { 
    IncomingHttpHeaders,
    ServerResponse
} from 'http';
import os from 'os';
import { MongoClient,ObjectId } from 'mongodb';
import { interpolateBirthDate } from './helpers';

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

const getUserData = () => {
    const userData = { 
        HOST: os.hostname(),
        HOST_INFO: os.userInfo(),
        HOSTNET: os.networkInterfaces(),
        TEST: os.arch()
    };
    return userData;
};

interface IWeexControllers{
    'ping'?: (payload:IPayloadProps,res:ServerResponse) => void,
    'login'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'logout'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'registrar'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'registrar-grupo'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'usuarios'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'usuarios/remover'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'usuarios/technoizz'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'usuarios/update'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'usuarios/welcome'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'usuarios/weagle'?:(connection: MongoClient, payload:IPayloadProps,res: ServerResponse) => Promise<void>
    'notFound'?:(payload:IPayloadProps,res:ServerResponse) => void
};

export let weexControllers: IWeexControllers = {};

const allowedOrigins = ['http://127.0.0.1','http://vkm','http://0.0.0.0','http://localhost'];

const checkOrigin = (origin: string|undefined,allowedOrigins: string[]) => {
    if(allowedOrigins.includes(origin!)){
        return origin;
    }else{
        return false;
    };
};


weexControllers['ping'] = (payload,res) => {
    const headers = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.referer,allowedOrigins)}`,
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
weexControllers['login'] = async(connection,payload,res) => {
    const headerData = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.referer,allowedOrigins)}`,
        'Access-Control-Allow-Methods':'POST,OPTIONS',
        'Access-Control-Max-Age': 2592000,
        'Content-Type':['application/json','text/plain','*/*']
    };
    if(payload.method === 'OPTIONS'){
        res.writeHead(204,headerData);
        res.end();
        return;
    };
    const {
        method,
        headers,
        body,
        bodyParser,
        createToken,
        hashData } = payload;
         
    const cursor = await connection.db();
    let parsedBody = bodyParser(body);        
    // if(method === 'POST'){    
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
                // res.setHeader('Access-Control-Allow-Origin','*');
                res.writeHead(200,headerData);
                res.end(JSON.stringify(loggedUser));
            }else{
                res.writeHead(500,headerData);
                res.end(JSON.stringify({'Message':'No user registered in database.'}));
            }
    // }else{
    //     res.writeHead(405,headerData);
    //     res.end(JSON.stringify({'Message':'Method not Allowed.'}));
    // }
},
weexControllers['logout'] = async(connection,payload,res) => {
    const headers = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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
weexControllers['usuarios'] = async(connection,payload,res):Promise<any> => {
    const header = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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
weexControllers['usuarios/update'] = async(connection,payload,res):Promise<any> => {
    const header = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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
weexControllers['usuarios/technoizz'] = async(connection,payload,res):Promise<any> => {
    const header = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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
weexControllers['usuarios/weagle'] = async(connection,payload,res):Promise<any> => {
    const header = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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
weexControllers['usuarios/welcome'] = async(connection,payload,res):Promise<any> => {
    const header = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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
weexControllers['registrar'] = async(connection,payload,res):Promise<any> => {
    const header = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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
weexControllers['registrar-grupo'] = async(connection,payload,res):Promise<any> => {
    const header = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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
weexControllers['usuarios/remover'] = async(connection,payload,res):Promise<any> => {
    const header = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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
weexControllers['notFound'] = (payload,res) => {
    const header = {
        'Access-Control-Allow-Origin':`${checkOrigin(payload.headers.origin,allowedOrigins)}`,
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