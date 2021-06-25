import express from 'express';
import multer from 'multer';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './db';
import fs from 'fs';
import path, { join } from 'path';
import { ObjectId } from 'mongodb';
import { createHmac } from 'crypto';
import filesNameFilter from './filesNameFilter';

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

app.use(express.static(join(__dirname, '../uploads')));

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
        return res.send('Server Running');
    }else{
        res.sendStatus(405);
        return res.end();
    }    
});

app.post('/apiweex/login',async(req,res): Promise<any> => {
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
                    res.status(404).send(JSON.stringify({'Message':'No user registered in database.'}));
                }
        }else{
            return res.status(405).end();
        }
});

app.post('/apiweex/logout',async(req,res): Promise<any> => {
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
               res.send(JSON.stringify(loggedOutUser));         
            }else{
                res.status(500).send(JSON.stringify({'Message':'User not found.'}));
            }      
    }else{
        return res.status(405).send(JSON.stringify({'Message':'Method not Allowed.'}));
    };
});

interface IPayloadProps{
    NOME_COMPLETO: string;
    EMAIL: string;
    CARGO: string;
    PASSWORD: string;
    ENDERECO: string;
    COMPLEMENTO: string;
    NUMERO: string;
    BAIRRO: string;
    CEP: string;
    CIDADE: string;
    SEXO: string;
    EMPRESA:string
};

app.post('/apiweex/usuarios/registrar', async(req,res): Promise<any> => {
    const cursor = await db.db();
        if(req.method === 'POST'){
            if(req.body['NOME_COMPLETO'] && req.body['EMAIL'] && req.body['CARGO'] && 
            req.body['PASSWORD'] && req.body['ENDERECO'] && req.body['COMPLEMENTO'] && req.body['NUMERO'] && 
            req.body['BAIRRO'] && req.body['CEP'] && req.body['CIDADE'] && req.body['SEXO']){
                try{
                  const data = await cursor.collection('login').findOne({
                      EMAIL: req.body['EMAIL']
                  })
                  if(data !== null){
                    res.send(400).json({'Message': 'Usuario ja existente'})
                  }else{
                    req.body['EMPRESA'] = String(req.body['EMPRESA']).toLowerCase(); 
                    req.body['hashedPassword'] = hashData(req.body['PASSWORD']);
                    delete req.body['PASSWORD'];
                    req.body['PASSWORD'] = req.body['hashedPassword'];
                    delete req.body['hashedPassword'];
                    await cursor.collection(String(req.body['EMPRESA']).toLowerCase()).insertOne(req.body)
                        .then(resp => {
                            if(Object.keys(resp.ops[0]).includes('_id')){
                                return resp.ops[0];
                            }else{
                                res.send(500).json();   
                            }
                        })
                        .then(async data => {
                            await cursor.collection('login').insertOne({
                                USER_ID: data['_id'],
                                NOME_COMPLETO: data['NOME_COMPLETO'],
                                EMAIL: data['EMAIL'],
                                PASSWORD: data['PASSWORD'],
                                EMPRESA: data['EMPRESA'],
                                CARGO: data['CARGO'],
                                TOKEN:'',
                                IS_LOGGED: false,
                                LAST_LOGIN: ''
                            })
                            .then(resp => {
                                res.send(resp);
                            })
                            .catch(err => console.error(err));
                        })
                        .catch(err => console.error(err));                    
                }                                                            
                }catch(err){
                    res.status(500).end(JSON.stringify(err));    
                }
            }else{
                return res.status(400).end(JSON.stringify({'Message':'Missing Fields.'}));    
            }                      
        }else{
            return res.status(405).end(JSON.stringify({'Message':'Method not Allowed.'}));
        }      
});



app.post('/apiweex/usuarios/registrar-grupo', async(req,res): Promise<any> => {
    const cursor = await db.db();
        if(req.method === 'POST'){
            console.log('sou o teste: ', req.body)
            if(typeof req.body === 'object' && req.body instanceof Array){
                try{
                    req.body.forEach(async (item, index) => {

                        const checkUserAlreayExist = await cursor.collection('login').find({"EMAIL": req.body[index]['EMAIL']}).toArray() 

                        if (checkUserAlreayExist.length > 0){
                            return
                        }

                        if(item['PASSWORD']){
                            item['PASSWORD'] = hashData(String(item['PASSWORD']));
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
                    return res.status(200).end(JSON.stringify({'Message':'User data inserted!'}));                                         
                }catch(err){
                    return res.status(500).end(JSON.stringify({'Message':'Usuário não registrado em nossa base. Por favor, efetue um registro!'}));    
                }
            }else{
                return res.status(400).end(JSON.stringify({'Message':'Missing Fields.'}));    
            }                      
        }else{
            return res.status(405).end(JSON.stringify({'Message':'Method not Allowed.'}));
        }
});

app.get('/apiweex/usuarios/:empresa',async(req,res) => {
    const empresa = req.params.empresa;
    const cursor = await db.db();
        if(req.method === 'GET'){
            try{
                const data = await cursor.collection(empresa).aggregate([]).toArray();
                return res.send(JSON.stringify(data));
            }catch(err){
                return res.status(500).send(err);    
            }               
        }else{
            return res.status(405).end(JSON.stringify({'Message':'Method not Allowed.'}));
        }
});

app.get("/apiweex/usuarios/:empresa/:id", async (req, res) => {
    const empresa = req.params.empresa;
    const id = req.params.id;
    const data: IUserLoginProps = req.body;
    const cursor = await db.db();
    if (req.method === "GET") {
      try {
        const data = await cursor
          .collection(empresa)
          .findOne({ id: new ObjectId(id) });
        return res.send(JSON.stringify(data));
      } catch (err) {
        return res.send(err);
      }
    } else {
      return res
        .status(405)
        .end(JSON.stringify({ Message: "Method not Allowed." }));
    }
  });
  
  app.put("/apiweex/usuarios/:empresa/:id", async (req, res) => {
    const empresa = req.params.empresa;
    const id = req.params.id;
    const payload: IUserLoginProps = req.body;
    const cursor = await db.db();
    if (req.method === "PUT") {
      try {
        const data = await cursor
          .collection(empresa)
          .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: payload });

        await cursor.collection('login').updateOne({
            'USER_ID': new ObjectId(id)
        },{
            $set:{
                NOME_COMPLETO: payload.NOME_COMPLETO,
            }
        });
        return res.send(JSON.stringify(data));
      } catch (err) {
        return res.send(err);
      }
    } else {
      return res
        .status(405)
        .end(JSON.stringify({ Message: "Method not Allowed." }));
    }
  });
  
  app.delete("/apiweex/usuarios/:empresa/:id", async (req, res) => {
    const empresa = req.params.empresa;
    const id = req.params.id;
    const cursor = await db.db();
    if (req.method === "DELETE") {
      try {
        const companyData = await cursor
          .collection(empresa)
          .findOneAndDelete({ _id: new ObjectId(id) });

        const loginData = await cursor.collection('login').findOneAndDelete({USER_ID: new ObjectId(id)});
        return res.status(204).send(JSON.stringify({company_data: companyData, login_data: loginData}));
      } catch (err) {
        return res.send(err);
      }
    } else {
      return res
        .status(405)
        .end(JSON.stringify({ Message: "Method not Allowed." }));
    }
  });
  
  app.get("/apiweex/videos", async (req, res) => {
      const cursor = db.db()
      if (req.method === 'GET') {
        try {
            const data = await cursor.collection('videos').find().toArray()
            return res.status(200).send(JSON.stringify(data))
        } catch (err) {
            return res.send(err)
        }
      } else {
          return res.status(405).send(JSON.stringify({Message: "Method not Allowed."}))
      }
  })

  interface IVideoProps{
    user: string;
    userAvatar: string;
    message: string;
    dataCreated: string;
};

  app.post("/apiweex/videos/comment/:id", async (req, res) => {
      const id = req.params.id
      const cursor = db.db()
      const body:IVideoProps = req.body

      if (req.method == "POST") {
          try {
              await cursor.collection('videos').findOneAndUpdate({_id: new ObjectId(id)}, {$push: {comments: body}})
              return res.status(200).send(body)
          } catch (err) {
              res.send(err)
          }
      } else {
          return res.status(405).send(JSON.stringify({Message: "Method not Allowed."}))
      }
  })
interface ILike {
    user_id: string
}
  app.get("/apiweex/videos/comments/:id", async (req, res) => {
      const id = req.params.id
      const cursor = db.db()

      if (req.method == "GET") {
        try {
            const data = await cursor
                .collection('videos')
                .findOne({_id: new ObjectId(id)}, {fields: {_id: 0, comments: 1}})
            return res
                .status(200)
                .send(data)
        } catch (err) {
            res.send(err)
        }
      } else {
          return res.status(405).send(JSON.stringify({Message: "Method not Allowed."}))
      }
  })

  app.post("/apiweex/videos/like/:id", async (req, res) => {
      const id = req.params.id
      const cursor = db.db()
      const user_id:ILike = req.body.user_id

      if (req.method == "POST") {
          try {
              const data = await cursor.collection('videos').findOneAndUpdate({_id: new ObjectId(id)}, {$addToSet: {likes: user_id}})
              res.status(200).send(data)
          } catch (err) {
              res.status(500).send(err)
          }
      } else {
          return res.status(405).send(JSON.stringify({Message: "Method not Allowed."}))
      }
  })
  
  app.put("/apiweex/videos/removelike/:id", async (req, res) => {
    const id = req.params.id
    const cursor = db.db()
    const user_id:ILike = req.body.user_id

    if (req.method == "PUT") {
        try {
            const data = await cursor.collection('videos').findOneAndUpdate({_id: new ObjectId(id)}, {$pull: {likes: user_id}}, (err, doc) => {
                console.log(err)
                console.log(doc)
            })
            res.status(200).send(data)
        } catch (err) {
            res.status(500).send(err)
        }
    } else {
        return res.status(405).send(JSON.stringify({Message: "Method not Allowed."}))
    }
})


const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req,file,callback) => {
        const filteredPic = filesNameFilter(`${req.params.user_id}${req.params.flag}`)
        if (filteredPic[0] && filteredPic.length === 1){
            fs.unlinkSync(path.join(__dirname, `../uploads/${filteredPic[0]}`))
        }
        const processedMimetype = file.mimetype.split('/')[1];
        callback(null, 'WEEX' + '-' +`${Math.floor(Math.random() * 100)}-${req.params.user_id}${req.params.flag}.${processedMimetype}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 1000000
    }
}).single('image');

app.post('/apiweex/upload/:user_id/:flag',(req,res) => {
    upload(req,res,(err:any) => {
        if(!err){
            console.log('Request:',req.body);
            console.log('File:',req.file);
            res.sendStatus(200);
            res.end();
        }else{
            res.sendStatus(500);
            res.end(err);
        };
    });
    
});

app.get('/apiweex/avatar/:imageName',(req,res) => {
    if (req.params.imageName !== "undefined"){
        const filteredImage = filesNameFilter(req.params.imageName)
        return res.status(200).send(filteredImage).end();
    }
    res.status(400).send({message: `${req.params.imageName} does not exist`}).end();
});

  const server = app.listen(PORT, HOST);
  
  server.keepAliveTimeout = 61 * 1000;
  
  server.headersTimeout = 65 * 1000;
  