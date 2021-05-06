import express from 'express';
import morgan from 'morgan';
import helmet, { xssFilter } from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';

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
    res.send('Server Running');
});

app.post('/login',(req,res) => {

});

app.post('/logout',(req,res) => {

});

app.listen(PORT,HOST);


